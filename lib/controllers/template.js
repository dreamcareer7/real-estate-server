const am = require('../utils/async_middleware')
const { expect } = require('../utils/validator')
const fixHeroku = require('../utils/fix-heroku.js')
const BrandTemplate = require('../models/Template/brand')
const Brand = require('../models/Brand')

const create = async (req, res) => {
  const template = await Template.create(req.body)
  res.model(template)
}

const instantiate = async (req, res) => {
  fixHeroku(req)

  const template = await Template.get(req.params.id)
  const { html, deals, contacts, listings } = req.body
  expect(html).to.be.a('string')

  const instance = await TemplateInstance.create({
    template,
    html,
    deals,
    contacts,
    listings,
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

const getForBrand = async (req, res) => {
  const { types, mediums } = req.query
  const { brand } = req.params

  expect(brand).to.be.uuid

  if (types)
    expect(types).to.be.an('array')

  if (mediums)
    expect(mediums).to.be.an('array')

  await Brand.limitAccess({
    user: req.user.id,
    brand
  })

  const templates = await BrandTemplate.getForBrand({
    brand,
    types,
    mediums
  })

  res.collection(templates)
}

const deleteTemplate = async (req, res) => {
  const bt = await BrandTemplate.get(req.params.id)

  expect(bt.brand).to.equal(req.params.brand)

  await BrandTemplate.delete(bt.id)

  res.status(204)
  return res.end()
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

const invalidateThumbnails = async (req, res) => {
  await BrandTemplate.invalidateByBrand(req.params.brand)
  res.status(204)
  res.end()
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.post('/templates', b, am(create))
  app.get('/brands/:brand/templates', b, am(getForBrand))
  app.delete('/brands/:brand/templates/:id', b, am(deleteTemplate))
  app.post('/brands/:brand/templates/thumbnails/invalidate', b, am(invalidateThumbnails))

  app.post('/templates/:id/instances', b, am(instantiate))
  app.get('/templates/instances', b, am(getInstances))
  app.get('/templates/instances/:instance', b, am(getInstance))
  app.post('/templates/instances/:instance/share', b, am(share))
  app.delete('/templates/instances/:instance', b, am(deleteInstance))

  app.post('/templates/assets', b, am(createAsset))
}

module.exports = router
