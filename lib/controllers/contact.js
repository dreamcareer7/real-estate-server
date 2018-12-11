const _ = require('lodash')
const kue = require('kue')
const moment = require('moment')

const promisify = require('../utils/promisify')
const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

const Orm = require('../models/Orm')
const Job = require('../models/Job')
const Slack = require('../models/Slack')
const Socket = require('../models/Socket')

const Brand = require('../models/Brand')
const Context = require('../models/Context')
const Contact = require('../models/Contact')
const ContactDuplicate = require('../models/Contact/duplicate')
const ContactEmail = require('../models/Contact/email')
const ContactList = require('../models/Contact/list')
const ContactListMember = require('../models/Contact/list_members')
const ContactAttribute = require('../models/Contact/attribute')
const ContactSummary = require('../models/Contact/summary')
const AttributeDef = require('../models/Contact/attribute_def')
const contactExport = require('../models/Contact/export')
const AttachedFile = require('../models/AttachedFile')
const Task = require('../models/CRM/Task')

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

async function getContacts(req, res) {
  /** @type {IContactFilterOptions & PaginationOptions} */
  const query = req.query

  _prepareQueryForFilters(query)
  query.limit = query.limit || 50

  const contacts = await Contact.getForBrand(getCurrentBrand(), [], query)
  await res.collection(contacts)
}

async function fastFilter(req, res) {
  /** @type {IContactFilterOptions & PaginationOptions} */
  const query = req.query || {}
  if (req.body.query && req.body.query.length > 0)
    query.q = req.body.query.split(/\s+/)

  _prepareQueryForFilters(query)
  query.limit = query.limit || 50

  const filters = req.body.filter
  if (filters)
    expect(filters).to.be.an('array')

  const filter_res = await Contact.fastFilter(getCurrentBrand(), filters, query)
  const rows = await Contact.getAll(Array.from(filter_res.ids))

  if (rows.length === 0) {
    res.collection([])
  }
  else {
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

  await Contact.delete([id])

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

  await Contact.update(user_id, brand_id, [{
    ...req.body,
    id,
  }])

  const contact = await Contact.get(id)
  await res.model(contact)
}

/**
 * @returns {Promise<UUID[]>}
 */
async function getMatchingIds(req) {
  const brand_id = getCurrentBrand()

  /** @type {UUID[]} */
  let ids = req.body.ids || []
  expect(ids).to.be.a('array')
  await limitAccess('write', req.user.id, brand_id, ids)

  let filters = []

  if (req.body.filters) {
    expect(req.body.filters).to.be.a('array')
    filters.push(req.body.filters)
  }

  if (req.body.lists) {
    expect(req.body.lists).to.be.a('array')
    const accessMap = await ContactList.hasAccess(brand_id, 'read', req.body.lists)
    accessMap.forEach((hasAccess, list_id) => {
      if (!hasAccess) {
        throw Error.ResourceNotFound(`Contact list ${list_id} not found.`)
      }
    })

    const lists = await ContactList.getAll(req.body.lists)
    filters = filters.concat(lists.map(list => list.filters).filter(x => Array.isArray(x)))
  }

  const query = req.query
  _prepareQueryForFilters(query)

  if (filters.length > 0) {
    const filter_result = await Promise.all(filters.map(filter => Contact.fastFilter(brand_id, filter, query)))
    ids = ids.concat(_.flatten(filter_result.map(res => Array.from(res.ids))))
  }
  else if (!ids || ids.length < 1) {
    const filter_result = await Contact.fastFilter(brand_id, [], query)
    ids = Array.from(filter_result.ids)
  }

  return _.uniq(ids)
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

  const affected_contacts_ids = await Contact.update(user_id, brand_id, req.body.contacts)

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

  const ids = await getMatchingIds(req)

  const contacts = []

  for (let i = 0; i < ids.length; i++) {
    contacts[i] = {
      id: ids[i],
      attributes: req.body.attributes
    }
  }

  const affected_contacts_ids = await Contact.update(user_id, brand_id, contacts)

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
  const ids = await getMatchingIds(req)

  await Contact.delete(ids, user_id)

  res.status(204)
  res.end()
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

  await ContactAttribute.delete(attrs, user_id)

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
    const contact_ids = await Contact.create(contacts, user_id, brand_id, options)

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

  await Contact.update(user_id, getCurrentBrand(), [{
    id: contact_id,
    attributes
  }])

  const contact = await Contact.get(contact_id)
  await res.model(contact)
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

/**
 * Attaches common success and failure event handlers to a job.
 * Sends a socket event to client for both final states.
 * @param {kue.Job} job 
 * @param {string} socket_event 
 */
function attachJobEventHandlers(job, socket_event) {
  const context = Context.getActive()

  job.on('complete', () => {
    Context.log(`>>> Job ${job.id} completed. Sending socket event to clients...`)

    context.enter()

    Socket.send(
      socket_event,
      job.data.user_id,
      [{
        job_id: job.id,
        result: job.toJSON().result,
        state: 'complete'
      }],

      (err) => {
        if (err)
          Context.error('>>> (Socket) Error sending task failure socket event.', err)
      }
    )
  }).on('failed', (ex) => {
    Context.log(`>>> Import job ${job.id} failed. Sending socket event to clients...`)

    context.enter()

    Socket.send(
      socket_event,
      job.data.user_id,
      [{
        job_id: job.id,
        state: 'failed',
        error: ex instanceof Error ? ex.message : ex.toString
      }],

      (err) => {
        if (err)
          Context.error('>>> (Socket) Error sending task failure socket event.', err)
      }
    )
  })
}

async function merge(req, res) {
  const user_id = req.user.id
  const parent_id = req.params.id
  const sub_contacts = req.body.sub_contacts

  await limitAccess('write', user_id, getCurrentBrand(), sub_contacts.concat(parent_id))
  await Contact.merge(user_id, getCurrentBrand(), sub_contacts, parent_id)

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

  /** @type {any[]} */
  const clusters = req.body.clusters
  expect(clusters).to.be.an('array')

  const contact_ids = clusters.reduce((ids, cl) => {
    return ids.concat(cl.parent).concat(cl.sub_contacts)
  }, [])

  const counts = _.countBy(contact_ids)
  for (const id in counts) {
    if (counts[id] > 1) {
      throw Error.Validation(`Contact ${id} appears in more than one cluster.`)
    }
  }

  await limitAccess('write', user_id, brand_id, contact_ids)

  const job = Job.queue
    .create('contact_duplicates', {
      clusters,
      user_id,
      brand_id,
      type: 'merge'
    })
    .ttl(5 * 60 * 1000)
    .save(err => {
      if (err)
        return res.error(err)

      res.json({
        code: 'OK',
        data: {
          job_id: job.id
        }
      })    
    })
    .on('complete', () => {
      Slack.send({
        channel: '6-support',
        text: `<mailto:${req.user.email}|${req.user.display_name}> merged ${clusters.length} duplicate clusters`,
        emoji: ':busts_in_silhouette:'
      })
    })

  attachJobEventHandlers(job, 'contact:merge')
}

async function getDuplicateClusters(req, res) {
  /** @type {PaginationOptions} */
  const query = req.query
  _prepareQueryForFilters(query)

  const clusters = await ContactDuplicate.findForBrand(getCurrentBrand(), query)

  res.collection(clusters)
}

async function getContactDuplicateCluster(req, res) {
  const contact_id = req.params.id
  expect(contact_id).to.be.a.uuid

  const cluster = await ContactDuplicate.findForContact(getCurrentBrand(), contact_id)

  res.model(cluster)
}

async function getAllTags(req, res) {
  const tags = await Contact.getAllTags(getCurrentBrand())
  return res.collection(tags)
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'Contact',
      id: req.params.id
    }],
    public: true
  }, (err, {file}) => {
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
      id: getCurrentBrand()
    }],
    public: false
  }, (err, {file}) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

const createImportJob = promisify((type, data, cb) => {
  const job = Job.queue
    .create('contact_import', {
      ...data,
      type
    })
    .ttl(5 * 60 * 1000)
    .save((err) => {
      if (err)
        return cb(err)

      cb(null, job.id)
    })

  attachJobEventHandlers(job, 'contact:import')
})

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

  await promisify(AttachedFile.get)(file_id)

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

  const job_id = await createImportJob('import_csv', {
    ...req.body,
    user_id: req.user.id,
    brand_id: brand_id
  })

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

  const job_id = await createImportJob('import_json', {
    contacts,
    user_id,
    brand_id
  })

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function jobStatus(req, res) {
  const job_id = req.params.job_id
  expect(job_id).to.match(/^[0-9]+$/)

  kue.Job.get(job_id, function(err, job) {
    if (err || !job || (job.data.brand_id !== getCurrentBrand()))
      throw Error.ResourceNotFound(`Job ${job_id} not found.`)

    // res.send(_.pick(job.toJSON(), 'result', 'state'))
    res.json({
      code: 'OK',
      data: job.toJSON()
    })
  })
}

async function getContactTimeline(req, res) {
  const contact_id = req.params.id
  const brand_id = getCurrentBrand()

  expect(contact_id).to.be.uuid

  const query = {
    limit: req.query.limit ? parseInt(req.query.limit) : 20
  }

  if (req.query.timestamp_lte) {
    query.timestamp_lte = parseFloat(req.query.timestamp_lte)
  }
  else if (req.query.max_value) {
    query.timestamp_lte = parseFloat(req.query.max_value)
  }

  const activities = await Contact.contactTimeline(
    contact_id,
    brand_id,
    query
  )
  return res.collection(activities)
}

async function exportAsCSV(req, res) {
  const associations = ['contact.attributes', 'contact_attribute.attribute_def']
  Orm.setEnabledAssociations(associations)

  const ids = await getMatchingIds(req)
  const models = await Contact.getAll(ids)

  /** @type {IParentContact[]} */
  const contacts = await Orm.populate({
    models,
    associations
  })

  const fileName = `Rechat_${moment().format('MM_DD_YY')}.csv`
  res.attachment(fileName)
  await contactExport.convertToOutlookCSV(contacts, res)
  res.end()
}

async function postEmails(req, res) {
  /** @type {any[]} */
  const emails = req.body.emails

  expect(emails).to.be.an('array')
  const user = req.user

  async function splice_emails(i, contact_ids) {
    const summaries = await ContactSummary.getAll(contact_ids)
    const by_id = _.keyBy(summaries.filter(c => c.email), 'id')

    const new_emails = Object.keys(by_id).map(id => {
      return {
        ...emails[i],
        to: by_id[id].email,
        contact: id
      }
    })

    emails.splice(i, 1, ...new_emails)
  }

  /** @type {ICrmAssociationInput[]} */
  const associations = []

  function add_associations(ids) {
    for (const id of ids) {
      // @ts-ignore
      associations.push({
        association_type: 'contact',
        contact: id
      })
    }
  }

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]
    email.from = `${user.display_name} <${user.email}>`

    if (email.contact) {
      add_associations([email.contact])
    }
    else if (email.list) {
      await ContactList.hasAccess(getCurrentBrand(), 'read', [email.list])

      const membership_records = await ContactListMember.findByListId(email.list)
      const contact_ids = membership_records.map(mr => mr.contact)
      await splice_emails(i, contact_ids)

      add_associations(contact_ids)

      // Redo the spliced position
      i = i - 1
    }
    else if (email.tag) {
      const filter_res = await Contact.fastFilter(getCurrentBrand(), [{
        attribute_type: 'tag',
        operator: 'eq',
        value: email.tag
      }], {})

      const contact_ids = Array.from(filter_res.ids)
      await splice_emails(i, contact_ids)

      add_associations(contact_ids)

      // Redo the spliced position
      i = i - 1
    }
  }

  await ContactEmail.createAll(
    emails,
    user
  )

  if (associations.length > 0) {
    await Task.create({
      title: emails[0].subject,
      status: 'DONE',
      task_type: 'Email',
      due_date: Date.now() / 1000,
      associations,
      assignees: [user.id]
    }, user.id, getCurrentBrand())
  }

  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, brandAccess, am(getContacts))
  app.post('/contacts', auth, brandAccess, am(addContacts))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.post('/contacts/attributes', auth, am(bulkAddAttributes))
  app.delete('/contacts/attributes', auth, am(deleteAttributes))

  app.get('/contacts/tags', auth, brandAccess, am(getAllTags))
  app.post('/contacts/merge', auth, am(bulkMerge))
  app.get('/contacts/duplicates', auth, brandAccess, am(getDuplicateClusters))

  app.post('/contacts/filter', auth, brandAccess, am(fastFilter))

  app.post('/contacts/upload', auth, brandAccess, upload)
  app.post('/contacts/import.csv', auth, brandAccess, am(importContactsCsv))
  app.post('/contacts/import.json', auth, brandAccess, am(importContactsJson))
  app.get('/contacts/jobs/:job_id', auth, brandAccess, am(jobStatus))

  app.post('/contacts/outlook.csv', auth, brandAccess, am(exportAsCSV))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('write'), am(updateContact))
  app.delete('/contacts/:id', auth, access('write'), am(deleteContact))

  app.post('/contacts/:id/attributes', auth, access('write'), am(addAttributes))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('write'), am(deleteAttribute))

  app.get('/contacts/:id/duplicates', auth, access('read'), am(getContactDuplicateCluster))
  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attachments', auth, access('write'), attach)
  app.get('/contacts/:id/timeline', auth, brandAccess, am(getContactTimeline))

  app.post('/contacts/emails', auth, am(postEmails))

  attachContactEventHandler()
}

module.exports = router
