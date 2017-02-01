const async = require('async')
const _u = require('underscore')
const expect = require('../utils/validator').expect

function getContact(req, res) {
  const contact_id = req.params.id

  Contact.get(contact_id, (err, contact) => {
    if(err)
      return res.error(err)

    res.model(contact)
  })
}

function getContacts (req, res) {
  const user_id = req.user.id
  const paging = {}
  const tags = req.query.tags

  if (tags) {
    expect(tags).to.be.a('array')
    Contact.getByTags(user_id, tags, (err, contacts) => {
      if (err)
        return res.error(err)

      return res.collection(contacts)
    })
  } else {
    req.pagination(paging)

    Contact.getForUser(user_id, paging, function (err, contacts) {
      if (err)
        return res.error(err)

      return res.collection(contacts)
    })
  }
}

function addContacts (req, res) {
  const user_id = req.user.id
  const contacts = req.body.contacts
  const fatal = req.body.hasOwnProperty('fail_on_error') ? req.body.fail_on_error : true

  if (!Array.isArray(contacts))
    return res.error(Error.Validation('You must supply an array of contacts'))

  async.map(contacts, (r, cb) => {
    Contact.add(user_id, r, (err, contact) => {
      if (err) {
        if (fatal)
          return cb(err)

        return cb()
      }

      return cb(null, contact)
    })
  }, (err, contacts) => {
    if (err)
      return res.error(err)

    contacts = contacts.filter(Boolean)
    return res.collection(contacts)
  })
}

function deleteContact (req, res) {
  const contact_id = req.params.id

  Contact.delete(contact_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function updateContact (req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attributes = req.body.attributes

  expect(attributes).to.be.a('array')

  async.map(attributes, (attribute, cb) => {
    const attribute_id = attribute.id
    const attribute_type = attribute.type

    Contact.patchAttribute(contact_id, user_id, attribute_id, attribute_type, attribute, err => {
      if (err)
        return cb(err)

      return cb()
    })
  }, (err, results) => {
    if(err)
      return res.error(err)

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err)

      return res.model(contact)
    })
  })
}

function search (req, res) {
  const user_id = req.user.id
  expect(req.query.q).to.be.a('array')

  if (!_u.isArray(req.query.q) || _u.isEmpty(req.query.q))
    return res.error(Error.Validation('Malformed search query'))

  const terms = req.query.q
  const limit = req.query.limit || 5

  Contact.stringSearch(user_id, terms, limit, (err, rooms) => {
    if (err)
      return res.error(err)

    return res.collection(rooms)
  })
}

function getAllTags (req, res) {
  const user_id = req.user.id
  expect(user_id).to.be.a.uuid

  Contact.getAllTags(user_id, (err, tags) => {
    if (err)
      return res.error(err)

    return res.collection(tags)
  })
}

function addAttributes (req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attributes = req.body.attributes

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attributes).to.be.a('array')

  async.map(attributes, (attribute, cb) => {
    expect(attribute).to.be.a('object')
    const attribute_type = attribute.type
    expect(attribute_type).to.be.a('string')

    Contact.addAttribute(contact_id, user_id, attribute_type, attribute, err => {
      if (err)
        return cb(err)

      return cb()
    })
  }, (err, results) => {
    if(err)
      return res.error(err)

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err)

      return res.model(contact)
    })
  })
}

function deleteAttribute (req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attribute_id = req.params.attribute_id

  Contact.deleteAttribute(contact_id, user_id, attribute_id, (err, contact) => {
    if(err)
      return res.error(err)

    return res.model(contact)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/contacts/tags', b(getAllTags))
  app.get('/contacts/search', b(search))
  app.get('/contacts', b(getContacts))
  app.get('/contacts/:id', b(getContact))
  app.post('/contacts', b(addContacts))
  app.post('/contacts/:id/attributes', b(addAttributes))
  app.patch('/contacts/:id/attributes', b(updateContact))
  app.delete('/contacts/:id/attributes/:attribute_id', b(deleteAttribute))
  app.delete('/contacts/:id', b(deleteContact))
}

module.exports = router
