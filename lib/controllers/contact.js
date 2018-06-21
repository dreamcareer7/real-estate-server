const _ = require('lodash')
const kue = require('kue')
const moment = require('moment')

const promisify = require('../utils/promisify')
const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

const Orm = require('../models/Orm')
const Job = require('../models/Job')
const Socket = require('../models/Socket')

const Brand = require('../models/Brand')
const Contact = require('../models/Contact')
const ContactAttribute = require('../models/Contact/attribute')
const AttributeDef = require('../models/Contact/attribute_def')
const contactExport = require('../models/Contact/export')
const AttachedFile = require('../models/AttachedFile')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

async function limitAccess(action, brand_id, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  const accessIndex = await Contact.hasAccess(brand_id, action, ids)

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

    limitAccess(action, getCurrentBrand(), ids).nodeify(err => {
      if (err) {
        return res.error(err)
      }

      next()
    })
  }
}

async function getContacts(req, res) {
  const query = req.query

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const sortable_fields = [
    'created_at',
    'updated_at'
  ]

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }

  const contacts = await Contact.getForBrand(getCurrentBrand(), [], query)
  await res.collection(contacts)
}

async function filter(req, res) {
  const query = req.query

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const sortable_fields = [
    'created_at',
    'updated_at'
  ]

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }

  const filters = req.body.filter
  if (filters)
    expect(filters).to.be.an('array')

  const contacts = await Contact.getForBrand(getCurrentBrand(), filters, query)
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

async function deleteContacts(req, res) {
  const ids = req.body.ids
  expect(ids).to.be.a('array')

  await limitAccess('update', getCurrentBrand(), ids)
  await Contact.delete(ids)

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

async function updateContacts(req, res) {
  const user_id = req.user.id
  const ids = req.body.contacts.map(contact => contact.id)

  await limitAccess('update', getCurrentBrand(), ids)

  await Contact.update(user_id, req.body.contacts)

  const contacts = await Contact.getAll(ids)
  await res.collection(contacts)
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
    const contact_ids = await Contact.create(contacts, user_id, getCurrentBrand(), options)

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

  await ContactAttribute.createForContact(attributes, contact_id, user_id, getCurrentBrand())
  const contact = await Contact.get(contact_id)
  await res.model(contact)
}

async function deleteAttribute(req, res) {
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  const affected_rows = await ContactAttribute.delete(contact_id, attribute_id)
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

  await limitAccess('update', getCurrentBrand(), sub_contacts.concat(parent_id))
  await Contact.merge(user_id, sub_contacts, parent_id)

  const parent = await Contact.get(parent_id)
  await res.model(parent)
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

function attachSocketEventsToJob(job) {
  const domain = process.domain

  job.on('complete', () => {
    console.log('>>> (Contacts) Import job completed. Sending socket event to clients...')

    domain.enter()

    Socket.send(
      'contact:import',
      job.data.user_id,
      [{
        job_id: job.id,
        state: 'complete'
      }],

      (err) => {
        if (err)
          console.error('>>> (Socket) Error sending task failed socket event.', err)
      }
    )
  }).on('failed', (ex) => {
    console.log('>>> (Contacts) Import job failed. Sending socket event to clients...')

    domain.enter()

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
}

async function importContactsCsv(req, res) {
  const file_id = req.body.file_id
  expect(file_id).to.be.uuid

  await promisify(AttachedFile.get)(file_id)

  const mappings = req.body.mappings
  expect(mappings).to.be.an('object')

  const defs = await AttributeDef.getForBrand(getCurrentBrand())
  const mapped_defs = _.map(mappings, m => m.attribute_def)

  for (let i = 0; i < mapped_defs.length; i++) {
    if (!defs.includes(mapped_defs[i])) {
      throw Error.Validation(`Mapping #${i} has a non-existing attribute_def id.`)
    }
  }

  const job = Job.queue
    .create('contact_import_csv', {
      ...req.body,
      user_id: req.user.id
    })
    .save((err, saved) => {
      if (err)
        return res.error(err)

      res.send({
        code: 'OK',
        data: {
          job_id: job.id
        }
      })
    })
  
  attachSocketEventsToJob(job)
}

async function importContactsJson(req, res) {
  const contacts = req.body.contacts
  expect(contacts).to.be.an('array')

  const job = Job.queue
    .create('contact_import_json', {
      contacts,
      user_id: req.user.id
    })
    .save((err, saved) => {
      if (err)
        return res.error(err)

      res.json({
        code: 'OK',
        data: {
          job_id: job.id
        }
      })
    })

  attachSocketEventsToJob(job)
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
  const ids = req.body.ids
  const query = req.query
  const userID = req.user.id
  const filters = req.body.filter
  let contacts
  
  if (query && filters) {  
    _prepareQueryForFilters(query)    

    if (filters)
      expect(filters).to.be.an('array')

    contacts = await Contact.getForBrand(userID, filters, query)
  } else if (!_.isEmpty(ids)) {
    await limitAccess('read', getCurrentBrand(), ids)
    contacts = await Contact.getAll(ids)
  } else {
    contacts = await Contact.getForBrand(req.user.id)  
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

function _prepareQueryForFilters(query) {
  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const sortable_fields = [
    'created_at',
    'updated_at'
  ]

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, am(getContacts))
  app.post('/contacts', auth, am(addContacts))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.get('/contacts/tags', auth, am(getAllTags))

  app.post('/contacts/upload', auth, upload)
  app.post('/contacts/import.csv', auth, am(importContactsCsv))
  app.post('/contacts/import.json', auth, am(importContactsJson))
  app.get('/contacts/import/:job_id/status', auth, am(importStatus))

  app.post('/contacts/outlook.csv', auth, am(exportAsCSV))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('update'), am(updateContact))
  app.delete('/contacts/:id', auth, access('update'), am(deleteContact))

  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attributes', auth, access('update'), am(addAttributes))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('update'), am(deleteAttribute))

  app.post('/contacts/:id/attachments', auth, access('update'), attach)

  app.get('/contacts/:id/timeline', auth, am(getContactTimeline))

  app.post('/contacts/filter', auth, am(filter))
}

module.exports = router
