const _ = require('lodash')
const kue = require('kue')
const moment = require('moment')

const promisify = require('../utils/promisify')
const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

const Orm = require('../models/Orm')
const Job = require('../models/Job')
const Socket = require('../models/Socket')

const Contact = require('../models/Contact')
const ContactEmail = require('../models/Contact/email')
const ContactList = require('../models/Contact/list')
const ContactAttribute = require('../models/Contact/attribute')
const AttributeDef = require('../models/Contact/attribute_def')
const contactExport = require('../models/Contact/export')
const AttachedFile = require('../models/AttachedFile')

const attachContactEventHandler = require('../models/Contact/events')

async function limitAccess(action, user_id, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  const accessIndex = await Contact.hasAccess(user_id, action, ids)

  for (const contact_id of ids) {
    if (!accessIndex.get(contact_id)) {
      throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
    }
  }
}

function access(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ?
      req.query.ids :
      [req.params.id]

    limitAccess(action, req.user.id, ids).nodeify(err => {
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
    'last_touch',
    'next_touch',
    'created_at',
    'updated_at'
  ]

  query.limit = query.limit || 50

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }
}

async function getContacts(req, res) {
  /** @type {UUID} */
  const user_id = req.user.id
  /** @type {IContactFilterOptions & PaginationOptions} */
  const query = req.query

  _prepareQueryForFilters(query)

  const contacts = await Contact.getForUser(user_id, [], query)
  await res.collection(contacts)
}

async function filter(req, res) {
  /** @type {UUID} */
  const user_id = req.user.id
  /** @type {IContactFilterOptions & PaginationOptions} */
  const query = req.query || {}
  if (req.body.query && req.body.query.length > 0)
    query.q = req.body.query.split(/\s+/)

  _prepareQueryForFilters(query)

  const filters = req.body.filter
  if (filters)
    expect(filters).to.be.an('array')

  const contacts = await Contact.getForUser(user_id, filters, query)
  await res.collection(contacts)
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
  const id = req.params.id
  expect(id).to.be.uuid

  await Contact.update(user_id, [{
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
  const user_id = req.user.id

  /** @type {UUID[]} */
  let ids = req.body.ids || []
  expect(ids).to.be.a('array')
  await limitAccess('update', user_id, ids)

  let filters = []

  if (req.body.filters) {
    expect(req.body.filters).to.be.a('array')
    filters.push(req.body.filters)
  }

  if (req.body.lists) {
    expect(req.body.lists).to.be.a('array')
    for (const list_id of req.body.lists) {
      expect(list_id).to.be.uuid
      await ContactList.checkAccess(user_id, list_id)
    }

    const lists = await ContactList.getAll(req.body.lists)
    filters = filters.concat(lists.map(list => list.filters).filter(x => Array.isArray(x)))
  }

  const query = req.query
  _prepareQueryForFilters(query)

  if (filters.length > 0) {
    const filter_result = await Promise.all(filters.map(filter => Contact.filter(user_id, filter, query)))
    ids = ids.concat(_.flatten(filter_result.map(res => Array.from(res.ids))))
  }
  else if (!ids || ids.length < 1) {
    const filter_result = await Contact.filter(user_id, [], query)
    ids = Array.from(filter_result.ids)
  }

  return _.uniq(ids)
}

async function updateContacts(req, res) {
  const user_id = req.user.id

  expect(req.body.attributes).to.be.an('array')

  const ids = await getMatchingIds(req)

  const contacts = []

  for (let i = 0; i < ids.length; i++) {
    contacts[i] = {
      id: ids[i],
      attributes: req.body.attributes
    }
  }

  await Contact.update(user_id, contacts)

  res.status(204)
  res.end()
}

async function deleteContacts(req, res) {
  const ids = await getMatchingIds(req)

  await Contact.delete(ids)

  res.status(204)
  res.end()
}

async function deleteAttributes(req, res) {
  const user_id = req.user.id
  const ids = req.body.ids
  const attrs = await ContactAttribute.getAll(ids)

  if (attrs.length < ids.length) {
    throw Error.ResourceNotFound('Some or all of the provided attribute ids do not exist.')
  }

  const contact_ids = _.uniq(attrs.map(a => a.contact))  
  await limitAccess('write', user_id, contact_ids)

  await ContactAttribute.delete(attrs)

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
      if (!Array.isArray(contacts[i].attributes)) {
        throw Error.Validation(`Contact #${i} doesn't have a required minimum of one attribute.`)
      }
    }
  }

  try {
    const contact_ids = await Contact.create(user_id, contacts, options)

    if (options.get) {
      const contacts = await Contact.getAll(contact_ids)
      return res.collection(contacts)
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

  await Contact.update(user_id, [{
    id: contact_id,
    attributes
  }])

  const contact = await Contact.get(contact_id)
  await res.model(contact)
}

async function deleteAttribute(req, res) {
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  const affected_rows = await ContactAttribute.deleteForContact(contact_id, attribute_id)
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

  await limitAccess('update', user_id, sub_contacts.concat(parent_id))
  await Contact.merge(user_id, sub_contacts, parent_id)

  const parent = await Contact.get(parent_id)
  await res.model(parent)
}

async function getAllTags(req, res) {
  const user_id = req.user.id
  expect(user_id).to.be.a.uuid

  const tags = await Contact.getAllTags(user_id)
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
  }, (err, file) => {
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
      role: 'User',
      id: req.user.id
    }],
    public: false
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

const createImportJob = promisify((type, data, cb) => {
  const context = Context.getActive()

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
    .on('complete', () => {
      console.log(`>>> (Contacts) Import job ${job.id} completed. Sending socket event to clients...`)

      context.enter()

      Socket.send(
        'contact:import',
        data.user_id,
        [{
          job_id: job.id,
          result: job.toJSON().result,
          state: 'complete'
        }],
  
        (err) => {
          if (err)
            console.error('>>> (Socket) Error sending task failed socket event.', err)
        }
      )
    }).on('failed', (ex) => {
      console.log(`>>> (Contacts) Import job ${job.id} failed. Sending socket event to clients...`)

      context.enter()

      Socket.send(
        'contact:import',
        job.data.user_id,
        [{
          job_id: job.id,
          state: 'failed',
          error: ex instanceof Error ? ex.message : ex.toString
        }],

        (err) => {
          if (err)
            console.error('>>> (Socket) Error sending task failed socket event.', err)
        }
      )
    })
})

async function importContactsCsv(req, res) {
  const file_id = req.body.file_id
  expect(file_id).to.be.uuid

  await promisify(AttachedFile.get)(file_id)

  const mappings = req.body.mappings
  expect(mappings).to.be.an('object')

  const def_ids = await AttributeDef.getForUser(req.user.id)
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
    user_id: req.user.id
  })

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function importContactsJson(req, res) {
  const contacts = req.body.contacts
  expect(contacts).to.be.an('array')

  const job_id = await createImportJob('import_json', {
    contacts,
    user_id: req.user.id,
  })

  res.json({
    code: 'OK',
    data: {
      job_id
    }
  })
}

async function importStatus(req, res) {
  const job_id = req.params.job_id
  expect(job_id).to.match(/^[0-9]+$/)

  kue.Job.get(job_id, function(err, job) {
    if (err || !job || (job.data.user_id !== req.user.id))
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
  const user_id = req.user.id

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid

  const query = {
    limit: req.query.limit ? parseInt(req.query.limit) : 20
  }

  if (req.query.timestamp_lte) {
    query.timestamp_lte = parseFloat(req.query.timestamp_lte)
  }
  else if (req.query.max_value) {
    query.timestamp_lte = parseFloat(req.query.max_value)
  }

  const activities = await Contact.contactTimeline(contact_id, query)
  return res.collection(activities)
}

async function exportAsCSV(req, res) {
  /** @type {IParentContact[]} */
  let contacts

  if (req.body.filters || req.body.ids || req.body.lists) {
    const ids = await getMatchingIds(req)

    contacts = await Contact.getAll(ids)
  } else {
    contacts = await Contact.getForUser(req.user.id)  
  }

  contacts = await Orm.populate({
    models: contacts,
    associations: ['contact.sub_contacts', 'sub_contact.attributes', 'contact_attribute.attribute_def']
  })

  const fileName = `Rechat_${moment().format('MM_DD_YY')}.csv`
  res.attachment(fileName)
  await contactExport.convertToOutlookCSV(contacts, res)
  res.end()
}

async function postEmails(req, res) {
  const { emails } = req.body
  expect(emails).to.be.an('array')
  const user = req.user

  for(const email of emails) {
    email.from = `${user.display_name} <${user.email}>`
    await ContactEmail.create({
      email,
      user,
    })
  }

  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, am(getContacts))
  app.post('/contacts', auth, am(addContacts))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.delete('/contacts/attributes', auth, am(deleteAttributes))
  app.get('/contacts/tags', auth, am(getAllTags))

  app.post('/contacts/filter', auth, am(filter))

  app.post('/contacts/upload', auth, upload)
  app.post('/contacts/import.csv', auth, am(importContactsCsv))
  app.post('/contacts/import.json', auth, am(importContactsJson))
  app.get('/contacts/import/:job_id/status', auth, am(importStatus))

  app.post('/contacts/outlook.csv', auth, am(exportAsCSV))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('update'), am(updateContact))
  app.delete('/contacts/:id', auth, access('update'), am(deleteContact))

  app.post('/contacts/:id/attributes', auth, access('update'), am(addAttributes))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('update'), am(deleteAttribute))
  
  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attachments', auth, access('update'), attach)
  app.get('/contacts/:id/timeline', auth, am(getContactTimeline))

  app.post('/contacts/emails', auth, am(postEmails))

  attachContactEventHandler()
}

module.exports = router
