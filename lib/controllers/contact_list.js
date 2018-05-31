// const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')
const ContactList = require('../models/Contact/list')

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
  const data = req.body
  const result = await ContactList.create(req.user.id, data)
  res.model(result)
}

async function update(req, res) {
  const id = req.params.id  
  const result = await ContactList.update(id, req.body)
  res.model(result)
}

async function listForUser(req, res) {
  const result = await ContactList.listForUser(req.user.id)
  res.collection(result.rows)
}

async function remove(req, res) {
  const result = await ContactList.delete(req.params.id, req.user.id)
  res.status(204)
  res.end()
}

async function getFilterOptions(req, res) {
  const filterOptions = await ContactList.getFilterOptions(req.user.id)
  res.model(filterOptions)
}

module.exports = (app) => {
  const auth = app.auth.bearer.middleware
  
  app.get('/contact/list', auth, am(listForUser))
  app.get('/contact/list/options', auth, am(getFilterOptions))
  app.post('/contact/list', auth, am(create))
  app.put('/contact/list/:id', auth, checkAccess, am(update))
  app.delete('/contact/list/:id', auth, checkAccess, am(remove))
}