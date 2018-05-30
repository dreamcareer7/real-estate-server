// const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')
const ContactSearchList = require('../models/Contact/search_list')

async function checkAccess(req, res, next) {
  try {
    await ContactSearchList.checkAccess(req.user.id, req.params.id)
  }
  catch (err) {
    return next(err)
  }
  next()
}

async function create(req, res) {
  const data = req.body
  const result = await ContactSearchList.create(req.user.id, data)
  res.model(result)
}

async function update(req, res) {
  const id = req.params.id  
  const result = await ContactSearchList.update(id, req.body)
  res.model(result)
}

async function listForUser(req, res) {
  const result = await ContactSearchList.listForUser(req.user.id)
  res.collection(result.rows)
}

async function remove(req, res) {
  const result = await ContactSearchList.delete(req.params.id, req.user.id)
  res.collection(result)
}

async function getFilterOptions(req, res) {
  const filterOptions = await ContactSearchList.getFilterOptions(req.user.id)
  res.model(filterOptions)
}

module.exports = (app) => {
  const auth = app.auth.bearer.middleware
  
  app.get('/contact-search-lists', auth, am(listForUser))
  app.get('/contact-search-lists/options', auth, am(getFilterOptions))
  app.post('/contact-search-lists', auth, am(create))
  app.put('/contact-search-lists/:id', auth, checkAccess, am(update))
  app.delete('/contact-search-lists/:id', auth, checkAccess, am(remove))
}