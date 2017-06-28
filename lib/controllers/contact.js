const async = require('async')
const _u = require('underscore')
const expect = require('../utils/validator').expect

function getContact(req, res) {
  const contact_id = req.params.id

  expect(contact_id).to.be.uuid

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

    Contact.getForUser(user_id, paging, (err, contacts) => {
      if (err)
        return res.error(err)

      return res.collection(contacts)
    })
  }
}

function addContacts (req, res) {
  const user_id = req.user.id
  const contacts = req.body.contacts || []
  const fatal = req.body.hasOwnProperty('fail_on_error') ? req.body.fail_on_error : true

  expect(contacts).to.be.a('array')
  expect(fatal).to.be.a('boolean')

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
  const attributes = req.body.attributes || []
  const ios_address_book_id = req.body.ios_address_book_id
  const android_address_book_id = req.body.android_address_book_id

  expect(attributes).to.be.a('array')

  async.auto({
    attributes: cb => {
      async.map(attributes, (attribute, cb) => {
        const attribute_id = attribute.id
        const attribute_type = attribute.type

        Contact.patchAttribute(contact_id, user_id, attribute_id, attribute_type, attribute, cb)
      }, cb)
    },
    address_book_id: cb => {
      Contact.patch(contact_id, {
        ios_address_book_id: ios_address_book_id,
        android_address_book_id: android_address_book_id
      }, cb)
    },
    get: [
      'attributes',
      'address_book_id',
      cb => {
        Contact.get(contact_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err)

    return res.model(results.get)
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

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [
      {
        role: 'Contact',
        id: req.params.id
      }
    ]
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
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
  app.post('/contacts/:id/attachments', b(attach))
  app.patch('/contacts/:id', b(updateContact))
  app.delete('/contacts/:id/attributes/:attribute_id', b(deleteAttribute))
  app.delete('/contacts/:id', b(deleteContact))
}

module.exports = router
