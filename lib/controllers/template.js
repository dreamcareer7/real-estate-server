const am = require('../utils/async_middleware')
const { expect } = require('../utils/validator')
const promisify = require('../utils/promisify')
const config = require('../config')

const create = async (req, res) => {
  const template = await Template.create(req.body)

  res.model(template)
}

const instanciate = async (req, res) => {
  const template = await Template.get(req.params.id)
  const { html, deals, contacts } = req.body

  expect(html).not.to.be.null

  const instance = await TemplateInstance.create({
    template,
    html,
    deals,
    contacts,
    created_by: req.user
  })

  res.model(instance)
}

const share = async (req, res) => {
  const instance = await TemplateInstance.get(req.params.instance)

  if (instance.created_by !== req.user.id)
    throw Error.Forbidden()

  TemplateInstance.share({
    ...req.body,
    instance
  })

  res.end()
}

const getForUser = async (req, res) => {
  const { types, mediums } = req.query

  if (types)
    expect(types).to.be.an('array')

  if (mediums)
    expect(mediums).to.be.an('array')

  const templates = await Template.getForUser({
    user: req.user.id,
    types,
    mediums
  })

  res.collection(templates)
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.post('/templates', b, am(create))
  app.get('/templates', b, am(getForUser))
  app.post('/templates/:id/instances', b, am(instanciate))
  app.post('/templates/instance/:instance/share', b, am(share))
}

module.exports = router
