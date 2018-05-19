const _ = require('lodash')
const Busboy = require('busboy')
const contactExport = require('../models/Contact/export')

const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const fixHeroku = require('../utils/fix-heroku')

const Contact = require('../models/Contact')
const ContactAttribute = require('../models/Contact/attribute')
const AttachedFile = require('../models/AttachedFile')
const moment = require('moment')

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

async function getContacts(req, res) {
  const user_id = req.user.id
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

  const contacts = await Contact.getForUser(user_id, [], query)
  await res.collection(contacts)
}

async function filter(req, res) {
  const user_id = req.user.id
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

async function deleteContacts(req, res) {
  const ids = req.body.ids
  expect(ids).to.be.a('array')

  await limitAccess('update', req.user.id, ids)
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

  await limitAccess('update', user_id, ids)

  await Contact.update(user_id, req.body.contacts)

  const contacts = await Contact.getAll(ids)
  await res.collection(contacts)
}

async function addContacts(req, res) {
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

  expect(contacts).to.be.a('array')

  if (options.relax !== true) {
    for (let i = 0; i < contacts.length; i++) {
      if (!Array.isArray(contacts[i].attributes)) {
        throw Error.Validation(`Contact #${i} doesn't have a required minimum of one attribute.`)
      }
    }
  }

  const end = fixHeroku(req)

  const contact_ids = await Contact.create(user_id, contacts, options)

  if (options.get) {
    const contacts = await Contact.getAll(contact_ids)
    end()
    return res.collection(contacts)
  }

  end()
  return res.collection(contact_ids)
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

  await ContactAttribute.createForContact(attributes, contact_id, user_id)
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

async function getContactTimeline(req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid

  const paging = {}
  req.pagination(paging)

  const activities = await Contact.contactTimeline(contact_id, paging)
  return res.collection(activities)
}

async function exportAsCSV(req, res) {
  const ids = req.body.ids
  let contacts = []
  if (!_.isEmpty(ids)) {
    await limitAccess('read', req.user.id, ids)
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

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, am(getContacts))
  app.post('/contacts', auth, am(addContacts))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.get('/contacts/tags', auth, am(getAllTags))

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
