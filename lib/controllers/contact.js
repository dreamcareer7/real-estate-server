const async = require('async')
const _u = require('underscore')
const expect = require('../utils/validator').expect
const Busboy = require('busboy')
const am = require('../utils/async_middleware')
const promisify = require('../utils/promisify')
const fixHeroku = require('../utils/fix-heroku')

async function checkAccess(req, res, next) {
  const ids = req.query.ids || req.body.ids
  if (!_u.isEmpty(ids) && _u.isArray(ids)) {
    try {
      await Contact.checkAccess(req.user.id, ids)
    } catch (e) {
      return next(e)
    }
  }
  next()  
}

function getContact(req, res) {
  const contact_id = req.params.id

  expect(contact_id).to.be.uuid

  Contact.get(contact_id, (err, contact) => {
    if (err)
      return res.error(err)

    res.model(contact)
  })
}

function getContacts(req, res) {
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

async function addContacts(req, res) {
  /** @type {UUID} */
  const user_id = req.user.id
  /** @type {IContact[]} */
  const contacts = req.body.contacts || []
  const options = req.body.hasOwnProperty('options') ? req.body.options : {}

  expect(contacts).to.be.a('array')
  expect(options).to.be.a('object')

  const end = fixHeroku(req)

  let result = []
  try {
    if (contacts.length === 1) {
      result = await Contact.add(user_id, contacts[0], options)
      end()
      return res.collection([result])
    }

    result = await Contact.addBulk(user_id, contacts, options)
    end()
    return res.collection(result)
  } catch (err) {
    end()
    return res.error(err)
  }
}

async function deleteContact(req, res) {
  try {
    await Contact.delete(req.user.id, [req.params.id])
    res.status(204)
    return res.end()
  } catch (e) {
    return res.error(e)
  }
}

function updateContact(req, res) {
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
    if (err)
      return res.error(err)

    return res.model(results.get)
  })
}

function search(req, res) {
  const user_id = req.user.id
  expect(req.query.q).to.be.a('array')

  if (!Array.isArray(req.query.q) || _u.isEmpty(req.query.q))
    return res.error(Error.Validation('Malformed search query'))

  const terms = req.query.q
  const limit = req.query.limit || 5

  Contact.stringSearch(user_id, terms, limit, (err, rooms) => {
    if (err)
      return res.error(err)

    return res.collection(rooms)
  })
}

async function filter(req, res) {
  const user_id = req.user.id
  const {
    attribute,
    values
  } = req.body

  const contacts = await Contact.getByAttribute(user_id, attribute, values)
  return res.collection(contacts)
}

function getAllTags(req, res) {
  const user_id = req.user.id
  expect(user_id).to.be.a.uuid

  Contact.getAllTags(user_id, (err, tags) => {
    if (err)
      return res.error(err)

    return res.collection(tags)
  })
}

function addAttributes(req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attributes = req.body.attributes

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attributes).to.be.a('array')

  async.map(attributes, (attribute, cb) => {
    expect(attribute).to.be.a('object')

    Contact.addAttribute(contact_id, user_id, attribute, err => {
      if (err)
        return cb(err)

      return cb()
    })
  }, (err, results) => {
    if (err)
      return res.error(err)

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err)

      return res.model(contact)
    })
  })
}

function deleteAttribute(req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id
  const attribute_id = req.params.attribute_id

  Contact.deleteAttribute(contact_id, user_id, attribute_id, (err, contact) => {
    if (err)
      return res.error(err)

    return res.model(contact)
  })
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

const upload = req => {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({
      headers: req.headers,
      limits: {
        fileSize: 200 * 1024 * 1024,
        files: 1,
      }
    })

    const ready = (fieldname, file, filename, encoding, mime) => {
      resolve({
        fieldname,
        file,
        filename,
        encoding,
        mime
      })
    }

    busboy.on('file', ready)
    busboy.on('error', reject)

    req.pipe(busboy)
  })
}

function exportAsOutlookCSV(req, res) {
  const user_id = req.user.id
  const ids = req.query.ids
  if (!_u.isEmpty(ids) && _u.isArray(ids)) {
    return exportAsOutlookCSVByIDS(req, res, ids)
  }
  const CONTACT_LIMIT = 10000
  const paging = {
    limit: CONTACT_LIMIT
  }
  const fileName = 'contacts.csv'
  res.attachment(fileName)

  Contact.getForUser(user_id, paging, (err, contacts) => {
    if (err)
      return res.error(err)

    Contact.Export.outlookCSV(contacts, res)
      .then(() => res.end())
  })
}

async function exportAsOutlookCSVByIDS(req, res, ids) {
  const fileName = 'contacts.csv'
  res.attachment(fileName)
  let contacts
  try {
    contacts = await promisify(Contact.getAll)(ids)
    Contact.Export.outlookCSV(contacts, res)
      .then(() => res.end())
  } catch (e) {
    res.error(e)
  }
}

async function deleteContacts(req, res) {
  const body = req.body

  expect(body.ids).to.be.a('array')

  try {
    await Contact.delete(req.user.id, body.ids)
    res.status(204)
    return res.end()
  } catch (e) {
    return res.error(e)
  }
}

async function searchFilters(req, res) {
  const filters = req.body.filters
  const tagsFilter = _u.find(filters, f => f.property === 'tag')
  const result = await Contact.getByTagFilters(req.user.id, tagsFilter.values)
  res.collection(result)
}

async function addTags(req, res) {
  expect(req.body.contactIDs).to.be.a('array')
  expect(req.body.tags).to.be.a('array')

  try {
    await Contact.addTags(req.user.id, req.body.contactIDs, req.body.tags)
  } catch(e) {
    res.error(e)
  }
  res.status(204)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/contacts/tags', auth, getAllTags)
  app.get('/contacts/search', auth, search)
  app.get('/contacts', auth, getContacts)
  app.get('/contacts/outlook.csv', auth, am(exportAsOutlookCSV))
  app.post('/contacts/search-filters', auth, am(searchFilters))
  app.get('/contacts/:id', auth, getContact)
  app.post('/contacts', auth, am(addContacts))
  app.post('/contacts/:id/attributes', auth, addAttributes)
  app.post('/contacts/:id/attachments', auth, attach)
  app.patch('/contacts/:id', auth, updateContact)
  app.delete('/contacts/:id/attributes/:attribute_id', auth, deleteAttribute)
  app.delete('/contacts/:id', auth, deleteContact)
  app.post('/contacts/filter', auth, filter)
  app.delete('/contacts', auth, checkAccess, am(deleteContacts))
  app.post('/contacts/tags', auth, am(addTags))
}

module.exports = router