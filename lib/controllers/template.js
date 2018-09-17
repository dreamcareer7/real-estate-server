const am = require('../utils/async_middleware')
const { expect } = require('../utils/validator')

const create = async (req, res) => {
  const template = await Template.create(req.body)

  res.model(template)
}

const getForUser = async (req, res) => {
  const { types } = req.query

  expect(types).to.be.an('array')

  const templates = await Template.getForUser(req.user.id, types)

  res.collection(templates)
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.post('/templates', b, am(create))
  app.get('/templates', b, am(getForUser))
}

module.exports = router
