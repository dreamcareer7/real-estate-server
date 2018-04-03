// const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')
const SearchFilter = require('../models/SearchFilter')

async function checkAccess(req, res, next) {
  try {
    await SearchFilter.checkAccess(req.user.id, req.params.id)
  }
  catch (err) {
    return next(err)
  }
  next()
}

async function create(req, res) {
  const data = req.body
  const result = await SearchFilter.create(req.user.id, data)
  res.collection([result])
}

async function update(req, res) {
  const id = req.params.id  
  const result = await SearchFilter.update(id, req.body, req.user.id)
  res.collection([result])
}

async function listForUser(req, res) {
  const result = await SearchFilter.listForUser(req.user.id)
  res.collection(result.rows)
}

async function remove(req, res) {
  const result = await SearchFilter.delete(req.params.id, req.user.id)
  res.collection([result])
}

async function getFilterOptions(req, res) {
  const filterOptions = await SearchFilter.getFilterOptions(req.user.id)
  res.collection([filterOptions])
}

module.exports = (app) => {
  const auth = app.auth.bearer.middleware
  
  app.get('/search-filters', auth, am(listForUser))
  app.get('/search-filters/options', auth, am(getFilterOptions))
  app.post('/search-filters', auth, am(create))
  app.put('/search-filters/:id', auth, checkAccess, am(update))
  app.delete('/search-filters/:id', auth, checkAccess, am(remove))
}