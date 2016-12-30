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

  if (req.query.tags) {
    Contact.getByTags(user_id, req.query.tags, function (err, contacts) {
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

  Contact.delete(contact_id, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function updateContact (req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attribute_id = req.params.attribute_id
  const attribute_type = req.body.type
  const attribute = req.body

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_type).to.be.a('string')
  expect(attribute).to.be.a('object')

  Contact.patchAttribute(contact_id, user_id, attribute_id, attribute_type, attribute, err => {
    if (err)
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

/**
 * Adds a `Tag` to a `Contact`
 * @name addTag
 * @memberof controller/contact
 * @instance
 * @function
 * @public
 * @summary POST /contacts/:id/tags
 * @param {request} req - request object
 * @param {response} res - response object
 */
function addTag (req, res) {
  const contact_id = req.params.id
  const tags = req.body.tags
  const user_id = req.user.id

  if (!Array.isArray(tags))
    return res.error(Error.Validation('You must supply an array of tags'))

  Contact.addTags(contact_id, tags, user_id, err => {
    if (err)
      return res.error(err)

    Contact.get(contact_id, (err, contact) => {
      if (err)
        return res.error(err)

      return res.model(contact)
    })
  })
}

/**
 * Removes a `Tag` from a `Contact`
 * @name removeTag
 * @memberof controller/contact
 * @instance
 * @function
 * @public
 * @summary DELETE /contacts/:id/tags/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function removeTag (req, res) {
  const contact_id = req.params.id
  const tag_id = req.params.tid
  const user_id = req.params.id

  Contact.removeTag(contact_id, tag_id, user_id, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/contacts/search', b(search))
  app.get('/contacts', b(getContacts))
  app.get('/contacts/:id', b(getContact))
  app.post('/contacts', b(addContacts))
  app.delete('/contacts/:id', b(deleteContact))
  app.patch('/contacts/:id/attributes/:attribute_id', b(updateContact))
  app.post('/contacts/:id/tags', b(addTag))
  app.delete('/contacts/:id/tags/:tid', b(removeTag))
}

module.exports = router
