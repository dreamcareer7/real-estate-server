const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Contact = require('../models/Contact/index.js')
const ContactList = require('../models/Contact/list.js')

async function checkAccess(req, res, next) {
  try {
    await ContactList.checkAccess(req.user.id, req.params.id)
  }
  catch (err) {
    return next(err)
  }
  next()
}

async function create(req, res) {
  const result = await ContactList.create(req.user.id, req.body)
  res.model(result)
}

async function update(req, res) {
  expect(req.params.id).to.be.uuid
  const result = await ContactList.update(req.params.id, req.body)

  res.model(result)
}

async function getLists(req, res) {
  const result = await ContactList.getForUser(req.user.id)
  res.collection(result)
}

async function remove(req, res) {
  expect(req.params.id).to.be.uuid

  const result = await ContactList.delete(req.params.id, req.user.id)

  if (result !== 1) {
    throw Error.ResourceNotFound(`Contact list ${req.params.id} not found.`)
  }

  res.status(204)
  res.end()
}

async function getFilterOptions(req, res) {
  const allTags = await Contact.getAllTags(req.user.id)
  const onlyTags = allTags.map(t => t.text)
  const filterOptions = {
    tag: {
      values: onlyTags,
      operator: 'all' 
    }
  }

  res.model(filterOptions)
}

module.exports = (app) => {
  const auth = app.auth.bearer.middleware

  app.get('/contacts/lists', auth, am(getLists))
  app.get('/contacts/lists/options', auth, am(getFilterOptions))
  app.post('/contacts/lists', auth, am(create))
  app.put('/contacts/lists/:id', auth, checkAccess, am(update))
  app.delete('/contacts/lists/:id', auth, checkAccess, am(remove))
}