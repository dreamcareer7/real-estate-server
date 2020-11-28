const _ = require('lodash')
const b64 = require('base64url').default

const { expect } = require('../utils/validator')
const am = require('../utils/async_middleware')

const Slack = require('../models/Slack')

const AttachedFile = require('../models/AttachedFile')
const AttributeDef = require('../models/Contact/attribute_def/get')
const Brand = require('../models/Brand')
const Contact = require('../models/Contact')
const LtsLead = require('../models/Contact/lead/save')
const ContactAttribute = require('../models/Contact/attribute')
const ContactDuplicate = require('../models/Contact/duplicate')
const ContactList = require('../models/Contact/list')
const ContactTag = require('../models/Contact/tag')
const Crypto = require('../models/Crypto')

const ImportWorker = require('../models/Contact/worker/import')
const DuplicatesWorker = require('../models/Contact/worker/duplicate')

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const attachContactEventHandler = require('../models/Contact/events')

/**
 * Access control function
 * @param {TAccessActions} action 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {UUID[]} ids 
 */
async function limitAccess(action, user_id, brand_id, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  await Brand.limitAccess({
    brand: brand_id,
    user: user_id
  })
  const accessIndex = await Contact.hasAccess(brand_id, action, ids)

  for (const contact_id of ids) {
    if (!accessIndex.get(contact_id)) {
      throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
    }
  }
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function access(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ?
      req.query.ids :
      [req.params.id]

    limitAccess(action, req.user.id, getCurrentBrand(), ids).nodeify(err => {
      if (err) {
        return res.error(err)
      }

      next()
    })
  }
}

function _prepareQueryForFilters(query) {
  if (!query)
    return

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  if (query.hasOwnProperty('parked')) {
    if (query.parked === 'true' || query.parked === true) {
      query.parked = true
    } else {
      query.parked = false
    }
  }

  if (query.q && query.q.length === 0) {
    delete query.q
  }

  const sortable_fields = [
    'display_name',
    'sort_field',
    'last_touch',
    'next_touch',
    'created_at',
    'updated_at'
  ]

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }
}

async function fastFilter(req, res) {
  const filter_res = await getMatchingIds(req, { limit: 50 })
  const rows = await Contact.getAll(Array.from(filter_res.ids))

  if (rows.length === 0) {
    res.collection([])
  }
  else {
    // @ts-ignore
    rows[0].total = filter_res.total
  
    await res.collection(rows)
  }
}

async function getContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  const contact = await Contact.get(id)
  await res.model(contact)
}

async function deleteContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  await Contact.delete([id], req.user.id)

  res.status(204)
  res.end()
}

async function updateContact(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const id = req.params.id
  expect(id).to.be.uuid

  const owner = req.body.user

  if (owner) {
    expect(owner).to.be.uuid
  
    await Brand.limitAccess({
      brand: brand_id,
      user: owner
    })
  }

  await Contact.update([{
    ...req.body,
    id,
  }], user_id, brand_id, 'direct_request')

  const contact = await Contact.get(id)
  await res.model(contact)
}

async function _getFilterFromRequest(brand_id, req, default_args = {}) {
  let filter = []
  if (req.body.filter) {
    expect(req.body.filter).to.be.an('array')
    filter = req.body.filter
  } else if (req.body.filters) {
    expect(req.body.filters).to.be.an('array')
    filter = req.body.filters
  } else if (req.body.attributes) {
    expect(req.body.attributes).to.be.an('array')
    filter = req.body.attributes
  }

  const body_args = req.body

  /** @type {IContactFilterOptions} */
  const query = Object.assign({}, default_args, req.query, body_args)

  if (query.lists) {
    expect(query.lists).to.be.an('array')
    const accessMap = await ContactList.hasAccess(brand_id, 'read', query.lists)
    accessMap.forEach((hasAccess, list_id) => {
      if (!hasAccess) {
        throw Error.ResourceNotFound(`Contact list ${list_id} not found.`)
      }
    })
  }

  if (typeof req.body.query === 'string' && req.body.query.length > 0) {
    query.q = req.body.query.split(/\s+/)
  }

  _prepareQueryForFilters(query)

  /** @type {UUID[]} */
  const ids = query.ids || []
  expect(ids).to.be.a('array')

  return {
    query,
    filter
  }
}

/**
 * @returns {Promise<{ ids: UUID[]; total: any; }>}
 */
async function getMatchingIds(req) {
  const brand_id = getCurrentBrand()
  const { filter, query } = await _getFilterFromRequest(brand_id, req)

  const ids = query.ids || []
  await limitAccess('write', req.user.id, brand_id, ids)

  console.log(JSON.stringify(filter, null, 2))
  const filter_result = await Contact.fastFilter(brand_id, filter, query)

  if (Array.isArray(ids) && ids.length > 0) {
    return {
      ...filter_result,
      ids: _.uniq(ids.concat(filter_result.ids))
    }
  }

  return filter_result
}

async function updateContacts(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  expect(req.body.contacts).to.be.an('array')
  const contact_ids = req.body.contacts.map(c => c.id)

  await limitAccess('write', user_id, brand_id, contact_ids)

  const owners = _.uniq(req.body.contacts
    .map(c => c.user)
    .filter(x => x))

  for (const owner of owners) {
    await Brand.limitAccess({
      brand: brand_id,
      user: owner
    })
  }

  const affected_contacts_ids = await Contact.update(req.body.contacts, user_id, brand_id, 'direct_request')

  if (req.query.get === 'true') {
    const affected_contacts = await Contact.getAll(affected_contacts_ids, user_id)
    res.collection(affected_contacts)
  }
  else {
    res.status(204)
    res.end()
  }
}

async function bulkAddAttributes(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  expect(req.body.attributes).to.be.an('array')

  const { ids } = await getMatchingIds(req)

  const contacts = []

  for (let i = 0; i < ids.length; i++) {
    contacts[i] = {
      id: ids[i],
      attributes: req.body.attributes
    }
  }

  const affected_contacts_ids = await Contact.update(contacts, user_id, brand_id, 'direct_request')

  if (req.query.get === 'true') {
    const affected_contacts = await Contact.getAll(affected_contacts_ids, user_id)
    res.collection(affected_contacts)
  }
  else {
    res.status(204)
    res.end()
  }
}

async function deleteContacts(req, res) {
  const user_id = req.user.id
  const { ids } = await getMatchingIds(req)

  await Contact.delete(ids, user_id)

  res.status(204)
  res.end()
}

async function undelete(req, res) {
  const brand_id = getCurrentBrand()
  const { filter, query } = await _getFilterFromRequest(brand_id, req)

  if (!query.deleted_gte && !query.deleted_lte) {
    return res.error(Error.BadRequest('either deleted_gte or deleted_lte params must be present'))
  }

  const affected = await Contact.undelete(brand_id, filter, query)

  res.json({
    code: 'OK',
    info: {
      affected
    }
  })
}

async function deleteAttributes(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const ids = req.body.ids
  const attrs = await ContactAttribute.getAll(ids)

  if (attrs.length < ids.length) {
    throw Error.ResourceNotFound('Some or all of the provided attribute ids do not exist.')
  }

  const contact_ids = _.uniq(attrs.map(a => a.contact))  
  await limitAccess('write', user_id, brand_id, contact_ids)

  await ContactAttribute.delete(ids, user_id)

  res.status(204)
  res.end()
}

async function addContacts(req, res) {
  if (!Array.isArray(req.body.contacts)) {
    throw Error.Validation('Contacts should be an array.')
  }

  if (req.body.hasOwnProperty('options')) {
    throw Error.BadRequest('options is deprecated and will be removed. Please send options as query arguments.')
  }

  /** @type {UUID} */
  const user_id = req.user.id

  /** @type {UUID} */
  const brand_id = getCurrentBrand()

  /** @type {IContact[]} */
  const contacts = req.body.contacts || []

  /** @type {IAddContactOptions} */
  const options = _(req.query)
    .pick(['get', 'activity', 'relax'])
    .transform((res, value, key) => {
      res[key] = value === 'true'
    }, {})
    .value()

  if (options.relax !== true) {
    for (let i = 0; i < contacts.length; i++) {
      const owner = contacts[i].user
      if (!owner || owner.length !== 36) {
        throw Error.Validation(`Contact #${i} doesn't have a "user" specified.`)
      }

      if (!Array.isArray(contacts[i].attributes)) {
        throw Error.Validation(`Contact #${i} doesn't have a required minimum of one attribute.`)
      }
    }
  }

  const owners = _.uniq(contacts
    .map(c => c.user)
    .filter(x => x))

  for (const owner of owners) {
    await Brand.limitAccess({
      brand: brand_id,
      user: owner
    })
  }

  try {
    const contact_ids = await Contact.create(contacts, user_id, brand_id, 'direct_request', options)

    if (options.get) {
      const contacts = await Contact.getAll(contact_ids)
      return res.collection(contacts)
    }

    const source_type = contacts[0].attributes.find(a => a.attribute_type === 'source_type')
    if (source_type && source_type.text === 'ExplicitlyCreated') {
      const n_contacts = contact_ids.length > 0 ?
        'a contact' :
        `${contact_ids.length} contacts`

      Slack.send({
        channel: '6-support',
        text: `${(`<mailto:${req.user.email}|${req.user.display_name}>`)} created ${n_contacts} manually`,
        emoji: ':busts_in_silhouette:'
      })
    }

    return res.collection(contact_ids)
  }
  catch (ex) {
    res.error(ex)
  }
}

async function addAttributes(req, res) {
  const user_id = req.user.id
  const contact_id = req.params.id
  expect(contact_id).to.be.uuid

  /** @type {IContactAttribute[]} */
  const attributes = req.body.attributes
  try {
    expect(attributes).to.be.an('array')
  }
  catch (ex) {
    throw Error.Validation('Expected attributes to be an array.')
  }

  const added_ids = await Contact.addAttributes(contact_id, attributes, user_id, getCurrentBrand(), 'direct_request')

  const added = await ContactAttribute.getAll(added_ids)
  res.collection(added)
}

async function updateAttribute(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  await Contact.update([{
    id: contact_id,
    attributes: [{
      ...req.body,
      id: attribute_id
    }]
  }], user_id, brand_id, 'direct_request')

  const updated = await ContactAttribute.get(attribute_id)
  res.model(updated)
}

async function deleteAttribute(req, res) {
  const user_id = req.user.id
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  const affected_rows = await ContactAttribute.deleteForContact(contact_id, attribute_id, user_id)
  if (affected_rows !== 1) {
    throw Error.ResourceNotFound(`Attribute with id ${attribute_id} not found.`)
  }

  const contact = await Contact.get(contact_id)
  await res.model(contact)
}

async function merge(req, res) {
  const user_id = req.user.id
  const parent_id = req.params.id
  const sub_contacts = req.body.sub_contacts

  await limitAccess('write', user_id, getCurrentBrand(), sub_contacts.concat(parent_id))
  await Contact.merge(sub_contacts, parent_id, user_id, getCurrentBrand())

  Slack.send({
    channel: '6-support',
    text: `<mailto:${req.user.email}|${req.user.display_name}> manually merged ${sub_contacts.length + 1} contacts`,
    emoji: ':busts_in_silhouette:'
  })

  const parent = await Contact.get(parent_id)

  await res.model(parent)
}

async function bulkMerge(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  /** @type {IContactDuplicateClusterInput[]} */
  const clusters = req.body.clusters
  expect(clusters).to.be.an('array')

  const contact_ids = clusters.reduce(/** @param {UUID[]} ids */(ids, cl) => {
    return ids.concat(cl.parent).concat(cl.sub_contacts)
  }, [])

  const counts = _.countBy(contact_ids)
  for (const id in counts) {
    if (counts[id] > 1) {
      throw Error.Validation(`Contact ${id} appears in more than one cluster.`)
    }
  }

  await limitAccess('write', user_id, brand_id, contact_ids)

  const job_id = await DuplicatesWorker.merge.immediate(
    clusters,
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function mergeAll(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const clusters = await ContactDuplicate.findForBrand(brand_id)

  const job_id = await DuplicatesWorker.merge.immediate(
    /** @type {IContactDuplicateClusterInput[]} */
    (clusters.map(cl => ({
      parent: cl.contacts[0],
      sub_contacts: cl.contacts.slice(1)
    }))),
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })    
}

async function ignoreAll(req, res) {
  const brand_id = getCurrentBrand()

  await ContactDuplicate.ignoreAll(brand_id)

  res.end()  
}

async function getDuplicateClusters(req, res) {
  /** @type {PaginationOptions} */
  const query = req.query
  _prepareQueryForFilters(query)

  const clusters = await ContactDuplicate.findForBrand(getCurrentBrand(), { ...query, limit: 100 })

  res.collection(clusters)
}

async function getContactDuplicateCluster(req, res) {
  const contact_id = req.params.id
  expect(contact_id).to.be.a.uuid

  const cluster = await ContactDuplicate.findForContact(getCurrentBrand(), contact_id)

  if (cluster) {
    return res.model(cluster)
  } 

  res.status(404)
  res.end()
}

async function getAllTags(req, res) {
  if (req.query.users) {
    expect(req.query.users).to.be.an('array')
  }

  const tags = await ContactTag.getAll(
    getCurrentBrand(),
    req.query.users
  )

  return res.collection(tags)
}

async function createTag(req, res) {
  await ContactTag.create(
    getCurrentBrand(),
    req.user.id,
    req.body.tag,
    req.body.touch_freq
  )

  res.status(204)
  res.end()
}

async function renameTag(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const src = req.params.tag
  const dst = req.body.tag

  await ContactTag.rename(brand_id, user_id, src, dst)

  res.status(204)
  res.end()
}

async function updateTagTouchFreq(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tag = req.params.tag

  await ContactTag.update_touch_frequency(brand_id, user_id, tag, req.body.touch_freq)

  res.status(204)
  res.end()  
}

async function deleteTag(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tag = req.params.tag
  const case_sensitive = req.query.case_sensitive || true

  await ContactTag.delete(brand_id, user_id, [tag], case_sensitive)

  res.status(204)
  res.end()  
}

async function deleteTags(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tags = req.body.tags
  const case_sensitive = req.query.case_sensitive || true

  await ContactTag.delete(brand_id, user_id, tags, case_sensitive)

  res.status(204)
  res.end()  
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'Contact',
      role_id: req.params.id
    }],
    public: true
  }, (err, { file } = {}) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

function upload(req, res) {
  AttachedFile.saveFromRequest({
    path: req.user.id + '-' + Date.now().toString(),
    req,
    relations: [{
      role: 'Brand',
      role_id: getCurrentBrand()
    }],
    public: false
  }, (err, {file}) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

async function importContactsCsv(req, res) {
  const brand_id = getCurrentBrand()

  const owner = req.body.owner
  expect(owner).to.be.uuid

  await Brand.limitAccess({
    brand: brand_id,
    user: owner
  })

  const file_id = req.body.file_id
  expect(file_id).to.be.uuid

  await AttachedFile.get(file_id)

  const mappings = req.body.mappings
  expect(mappings).to.be.an('object')

  const def_ids = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs.filter(d => d.name), 'name')

  /** @type {UUID[]} */
  const mapped_fields = []

  for (let i = 0; i < mappings.length; i++) {
    if (!mappings[i].attribute_def && !mappings[i].attribute_type) {
      throw Error.Validation(`Mapping #${i} has no attribute_def or attribute_type defined.`)
    }
    if (!def_ids.includes(mappings[i].attribute_def) && !defs_by_name.hasOwnProperty(mappings[i].attribute_type)) {
      throw Error.Validation(`Mapping #${i} has a non-existing attribute_def or attribute_type.`)
    }

    const def = mappings[i].attribute_def ?
      defs_by_id[mappings[i].attribute_def] :
      defs_by_name[mappings[i].attribute_type]

    if (mapped_fields.includes(def.id) && def.singular) {
      throw Error.Validation(`Mapping #${i} is singular, but it's mapped more than once.`)
    }

    mapped_fields.push(def.id)
  }

  const job_id = await ImportWorker.import_csv.immediate(
    req.user.id,
    brand_id,
    file_id,
    owner,
    mappings
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function importContactsJson(req, res) {
  const brand_id = getCurrentBrand()
  const user_id = req.user.id

  const { contacts } = req.body
  expect(contacts).to.be.an('array')
  const owners = _.uniq(contacts.map(c => c.user))

  for (const owner of owners) {
    await Brand.limitAccess({
      brand: brand_id,
      user: owner
    })
  }

  const job_id = await ImportWorker.import_json.immediate(
    contacts,
    user_id,
    brand_id
  )

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function jobStatus(req, res) {
  res.json({
    code: 'OK',
    data: {
      state: 'pending'
    }
  })
}

async function ignoreCluster(req, res) {
  const brand_id = getCurrentBrand()
  const cluster_id = parseInt(req.params.id)

  await ContactDuplicate.ignoreCluster(brand_id, cluster_id)

  res.end()
}

async function ignoreContactFromCluster(req, res) {
  const brand_id = getCurrentBrand()
  const cluster_id = parseInt(req.params.id)
  const contact_id = req.params.contact

  expect(contact_id).to.be.uuid

  await ContactDuplicate.ignoreContactFromCluster(brand_id, cluster_id, contact_id)

  res.end()
}

async function captureLead(req, res) {
  const decrypted = Crypto.decrypt(b64.decode(req.params.key))

  /** @type {import('../models/Contact/lead/types').ILtsLeadUrlMetadata} */
  let data
  try {
    data = JSON.parse(decrypted)
    data = {
      mls: ['NTREIS'],
      ...data,
      source: 'Website',
    }
  }
  catch(err) {
    throw Error.Validation('Data is malformed')
  }

  switch (data.protocol) {
    case 'LeadTransmissionStandard':
      await LtsLead.save(data, req.body)
      break
    default:
      throw Error.Validation('Unexpected lead data format.')
  }

  res.status(204)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, brandAccess, am(fastFilter))
  app.post('/contacts', auth, brandAccess, am(addContacts))
  app.post('/contacts/undelete', auth, brandAccess, am(undelete))
  app.post('/contacts/leads/:key', am(captureLead))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.post('/contacts/attributes', auth, am(bulkAddAttributes))
  app.delete('/contacts/attributes', auth, am(deleteAttributes))

  app.post('/contacts/merge/all', auth, am(mergeAll))
  app.post('/contacts/merge', auth, am(bulkMerge))
  app.get('/contacts/duplicates', auth, brandAccess, am(getDuplicateClusters))
  app.delete('/contacts/duplicates/all', auth, am(ignoreAll))
  app.delete('/contacts/duplicates/:id', auth, brandAccess, am(ignoreCluster))
  app.delete('/contacts/duplicates/:id/contacts/:contact', auth, brandAccess, am(ignoreContactFromCluster))

  app.get('/contacts/tags', auth, brandAccess, am(getAllTags))
  app.post('/contacts/tags', auth, brandAccess, am(createTag))
  app.post('/contacts/tags/delete', auth, brandAccess, am(deleteTags))
  app.patch('/contacts/tags/:tag', auth, brandAccess, am(renameTag))
  app.patch('/contacts/tags/:tag/touch', auth, brandAccess, am(updateTagTouchFreq))
  app.delete('/contacts/tags/:tag', auth, brandAccess, am(deleteTag))

  app.post('/contacts/filter', auth, brandAccess, am(fastFilter))

  app.post('/contacts/upload', auth, brandAccess, upload)
  app.post('/contacts/import.csv', auth, brandAccess, am(importContactsCsv))
  app.post('/contacts/import.json', auth, brandAccess, am(importContactsJson))
  app.get('/contacts/jobs/:job_id', auth, brandAccess, am(jobStatus))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('write'), am(updateContact))
  app.delete('/contacts/:id', auth, access('write'), am(deleteContact))

  app.post('/contacts/:id/attributes', auth, access('write'), am(addAttributes))
  app.put('/contacts/:id/attributes/:attribute_id', auth, access('write'), am(updateAttribute))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('write'), am(deleteAttribute))

  app.get('/contacts/:id/duplicates', auth, access('read'), am(getContactDuplicateCluster))
  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attachments', auth, access('write'), attach)

  attachContactEventHandler()
}

module.exports = router
