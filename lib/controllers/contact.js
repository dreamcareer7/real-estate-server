const _ = require('lodash')
const Busboy = require('busboy')

const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const fixHeroku = require('../utils/fix-heroku')

const Orm = require('../models/Orm')
const Contact = require('../models/Contact')
const ContactAttribute = require('../models/Contact/attribute')
const AttributeDef = require('../models/Contact/attribute_def')
const AttachedFile = require('../models/AttachedFile')

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

function getDefsForContacts(models) {
  const ids_to_get = _(models)
    .flatMap(c => c.sub_contacts)
    .flatMap(sc => sc.attributes)
    .map(attr => attr.attribute_def)
    .value()

  return AttributeDef.getAll(ids_to_get)
}

function fixAttributeDefReferences(models) {
  for (const c of models) {
    for (const sc of c.sub_contacts) {
      for (const a of sc.attributes) {
        a.attribute_def = {
          type: 'reference',
          object_type: 'contact_attribute_def',
          id: a.attribute_def
        }
      }
    }
  }

  return models
}

async function returnContactModel(data, req, res) {
  const enabled_associations = req.query.associations || []

  const format = req.headers['x-rechat-format'] || Orm.NEST
  const populated = await Orm.populate({
    models: [data],
    associations: enabled_associations,
    format
  })

  const defs = await getDefsForContacts([data])

  if (format === Orm.NEST) {
    return res.json({
      code: 'OK',
      data: populated[0],
      contact_attribute_defs: defs
    })
  }

  return res.json({
    code: 'OK',
    data: fixAttributeDefReferences(populated.data)[0],
    references: 
      Object.assign(populated.references, {
        contact_attribute_def: _.keyBy(defs, 'id')
      }),
  })
}

async function returnContactsCollection(models, req, res) {
  let total = 0

  if (models[0] && models[0].hasOwnProperty('total')) {
    total = models[0].total
    delete models[0].total
  }

  const enabled_associations = req.query.associations || []
  const format = req.headers['x-rechat-format'] || Orm.NEST

  const populated = await Orm.populate({
    models: models.filter(Boolean),
    associations: enabled_associations,
    format
  })

  const defs = await getDefsForContacts(models)

  const info = {
    count: models.length,
    total: total || 0
  }

  if (format === Orm.NEST) {
    return res.json({
      code: 'OK',
      data: populated,
      contact_attribute_defs: defs,
      info
    })
  }

  return res.json({
    code: 'OK',
    data: fixAttributeDefReferences(populated.data),
    references: 
      Object.assign(populated.references, {
        contact_attribute_def: _.keyBy(defs, 'id')
      }),
    info
  })
}

async function getContacts(req, res) {
  const user_id = req.user.id
  const query = req.query

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const contacts = await Contact.getForUser(user_id, [], query)
  await returnContactsCollection(contacts, req, res)
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
  await returnContactsCollection(contacts, req, res)
}

async function getContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  const contact = await Contact.get(id)
  await returnContactModel(contact, req, res)
}

async function deleteContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  await Contact.delete([id])

  res.status(204)
  res.end()
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

  await Contact.update(user_id, [{
    ...req.body,
    id,
  }])

  const contact = await Contact.get(id)
  await returnContactModel(contact, req, res)
}

async function updateContacts(req, res) {
  const user_id = req.user.id
  const ids = req.body.contacts.map(contact => contact.id)

  await limitAccess('update', user_id, ids)

  await Contact.update(user_id, req.body.contacts)

  const contacts = await Contact.getAll(ids)
  await returnContactsCollection(contacts, req, res)
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
    return await returnContactsCollection(contacts, req, res)
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
  await returnContactModel(contact, req, res)
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
  await returnContactModel(contact, req, res)
}

async function merge(req, res) {
  const user_id = req.user.id
  const parent_id = req.params.id
  const sub_contacts = req.body.sub_contacts

  await limitAccess('update', user_id, sub_contacts.concat(parent_id))
  await Contact.merge(user_id, sub_contacts, parent_id)

  const parent = await Contact.get(parent_id)
  await returnContactModel(parent, req, res)
}

async function getAttributeDefs(req, res) {
  const user_id = req.user.id

  const def_ids = await AttributeDef.getForUser(user_id)
  const defs = await AttributeDef.getAll(def_ids)

  return res.collection(defs)
}

async function addAttributedef(req, res) {
  res.send(404)
  res.end()
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
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, access('update'), am(deleteContacts))

  app.get('/contacts/tags', auth, am(getAllTags))

  app.get('/contacts/attribute_defs', auth, am(getAttributeDefs))
  app.post('/contacts/attribute_defs', auth, am(addAttributedef))
  // app.get('/contacts/outlook.csv', auth, am(exportAsOutlookCSV))
  // app.post('/contacts/outlook.csv', auth, am(outlookCSV))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('update'), am(updateContact))
  app.delete('/contacts/:id', auth, access('update'), am(deleteContact))

  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attributes', auth, access('update'), am(addAttributes))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('update'), am(deleteAttribute))

  app.post('/contacts/:id/attachments', auth, access('update'), attach)

  app.get('/contacts/:id/timeline', auth, am(getContactTimeline))

  // app.get('/contacts/search', auth, am(search))
  app.post('/contacts/filter', auth, am(filter))
}

module.exports = router