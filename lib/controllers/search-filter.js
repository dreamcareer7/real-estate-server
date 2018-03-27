const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')

async function create(req, res) {
  const data = req.body
  const result = await SearchFilter.create(req.user.id, data)
  res.collection([result])
}

async function update(req, res) {
  const id = req.params.id
  const result = await SearchFilter.update(id, req.user.id, req.body)
  res.collection([result])
}

async function listForUser(req, res) {
  const result = await SearchFilter.ListForUser(req.user.id)
  res.collection(result.rows)
}

async function remove(req, res) {
  const result = await SearchFilter.remove(req.params.id, req.user.id)
  res.collection([result])
}

module.exports = (app) => {
  const auth = app.auth.bearer.middleware
  
  app.post('/search-filters/', auth, am(create))
  app.get('/search-filters/', auth, am(listForUser))
  app.patch('/search-filters/:id', auth, am(update))
  app.delete('/search-filters/:id', auth, am(remove))
}