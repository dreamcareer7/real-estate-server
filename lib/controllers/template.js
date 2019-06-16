const am = require('../utils/async_middleware')
const { expect } = require('../utils/validator')
const fixHeroku = require('../utils/fix-heroku.js')

const create = async (req, res) => {
  const template = await Template.create(req.body)

  res.model(template)
}

const instantiate = async (req, res) => {
  fixHeroku(req)

  const template = await Template.get(req.params.id)
  const { html, deals, contacts } = req.body
  expect(html).to.be.a('string')

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

  await TemplateInstance.share({
    ...req.body,
    instance
  })

  res.model(instance)
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

const getInstance = async (req, res) => {
  const instance = await TemplateInstance.get(req.params.instance)

  res.model(instance)
}

const deleteInstance = async (req, res) => {
  const instance = await TemplateInstance.get(req.params.instance)

  if (instance.created_by !== req.user.id)
    throw new Error.Forbidden()

  await TemplateInstance.delete(req.params.instance)

  res.status(204)
  return res.end()
}

const getInstances = async (req, res) => {
  const instances = await TemplateInstance.getByUser(req.user.id)

  res.collection(instances)
}

const createAsset = async (req, res) => {
  const asset = await TemplateAsset.createFromRequest(req)

  res.model(asset)
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.post('/templates', b, am(create))
  app.get('/templates', b, am(getForUser))

  app.post('/templates/:id/instances', b, am(instantiate))
  app.get('/templates/instances', b, am(getInstances))
  app.get('/templates/instances/:instance', b, am(getInstance))
  app.post('/templates/instances/:instance/share', b, am(share))
  app.delete('/templates/instances/:instance', b, am(deleteInstance))

  app.post('/templates/assets', b, am(createAsset))
}

module.exports = router
