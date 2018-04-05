const _ = require('lodash')
const Busboy = require('busboy')

const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const fixHeroku = require('../utils/fix-heroku')

const Contact = require('../models/Contact')
const ContactAttribute = require('../models/Contact/attribute')
const AttributeDef = require('../models/Contact/attribute_def')
const AttachedFile = require('../models/AttachedFile')

function limitAccess(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.params.ids) ?
      req.query.ids :
      [req.params.id]
    
    for (const contact_id of ids) {
      expect(contact_id).to.be.uuid
    }

    Contact.hasAccess(req.user.id, action, ids).nodeify((err, accessIndex) => {
      if (err) {
        return res.error(err)
      }

      for (const contact_id of ids) {
        if (!accessIndex.get(contact_id)) {
          throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
        }
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

  const contacts = await Contact.getForUser(user_id, [], query)
  res.collection(contacts)
}

async function filter(req, res) {
  const user_id = req.user.id
  const query = req.query

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const filters = req.body.filter
  expect(filters).to.be.an('array')

  const contacts = await Contact.getForUser(user_id, filters, query)
  res.collection(contacts)
}

async function getContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  const contact = await Contact.get(id)
  res.model(contact)
}

async function deleteContacts(req, res) {
  const ids = req.query.ids
  await Contact.delete(ids)

  res.status(204)
  res.end()
}

async function updateContact(req, res) {
  const user_id = req.user.id
  const id = req.params.id
  expect(id).to.be.uuid

  await Contact.update(id, user_id, req.body)

  const contact = await Contact.get(id)
  res.model(contact)
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

  const end = fixHeroku(req)

  const contact_ids = await Contact.create(user_id, contacts, options)

  if (options.get) {
    const contacts = await Contact.getAll(contact_ids)
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
  expect(attributes).to.be.an('array')

  await ContactAttribute.createForContact(attributes, contact_id, user_id)
  const contact = await Contact.get(contact_id)
  res.model(contact)
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
  res.model(contact)
}

async function getAttributeDefs(req, res) {
  const user_id = req.user.id

  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)

  return res.collection(defs)
}

async function getAllTags(req, res) {
  
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'Contact',
      id: req.params.id
    }]
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

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts', auth, am(getContacts))
  app.post('/contacts', auth, am(addContacts))
  app.delete('/contacts', auth, am(deleteContacts))

  app.get('/contacts/tags', auth, am(getAllTags))
  app.get('/contacts/attribute_defs', auth, am(getAttributeDefs))

  // app.get('/contacts/outlook.csv', auth, am(exportAsOutlookCSV))
  // app.post('/contacts/outlook.csv', auth, am(outlookCSV))

  app.get('/contacts/:id', auth, limitAccess('read'), am(getContact))
  app.patch('/contacts/:id', auth, limitAccess('update'), am(updateContact))
  
  app.post('/contacts/:id/attributes', auth, limitAccess('update'), am(addAttributes))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, limitAccess('update'), am(deleteAttribute))

  app.post('/contacts/:id/attachments', auth, limitAccess('update'), attach)

  app.get('/contacts/:id/timeline', auth, am(getContactTimeline))

  // app.get('/contacts/search', auth, am(search))
  app.post('/contacts/filter', auth, am(filter))
}

module.exports = router