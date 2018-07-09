const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

const create = async (req, res) => {
  const template = await Template.create(req.body)

  res.model(template)
}

const getForUser = async (req, res) => {
  const templates = await Template.getForUser(req.user.id)

  res.collection(templates)
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.post('/templates', b, am(create))
  app.get('/templates', b, am(getForUser))
}

module.exports = router
