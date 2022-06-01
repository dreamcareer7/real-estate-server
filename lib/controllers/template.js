const _ = require('lodash')
const am = require('../utils/async_middleware')
const { expect } = require('../utils/validator')
const fixHeroku = require('../utils/fix-heroku.js')
const promisify = require('../utils/promisify')
const BrandTemplate = require('../models/Template/brand')
const Brand = require('../models/Brand')
const BrandConstant = require('../models/Brand/constants')
const BrandSettings = require('../models/Brand/settings/get')
const Template = require('../models/Template')
const TemplateInstance = require('../models/Template/instance')
const TemplateAsset = require('../models/Template/asset/create')
const AttachedFile = require('../models/AttachedFile')
const User = require('../models/User')
const Sms = require('../models/SMS')
const { Listing } = require('../models/Listing')
const renderTemplate = require('../models/Template/thumbnail/render')
const bodyParser = require('body-parser')
const Mime = require('mime')
const Context = require('../models/Context')
const BrandRole = {
  ...require('../models/Brand/role/save'),
  ...require('../models/Brand/role/members'),
}

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

  const templates = await BrandTemplate.getForBrands({
    brands: [brand],
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
  const { limit, start, template_types, mediums } = req.query

  const instances = await TemplateInstance.getByUser(req.user.id, {
    limit,
    start,
    template_types,
    mediums
  })

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

const render = async (req, res) => {
  const variables = {}

  _.set(variables, 'user', req.user)

  if (req.body.listing)
    _.set(variables, 'listing', await Listing.get(req.body.listing))

  if (req.body.listings)
    _.set(variables, 'listings', await Listing.getAll(req.body.listings))

  if (req.body.variables)
    for(const key in req.body.variables)
      _.set(variables, key, req.body.variables[key])

  const template_id = req.params.id
  const template = await Template.get(template_id)

  const current_brand = Brand.getCurrent()

  if (!current_brand)
    throw Error.Validation('This endpoint requires a brand')

  
  const brand = Brand.getParentByType(current_brand.id, BrandConstant.BROKERAGE)

  const { marketing_palette: palette } = await BrandSettings.getByBrand(brand.id)

  const html = (await promisify(AttachedFile.download)(template.file)).toString()

  const output = await renderTemplate({html, template, brand, palette, variables})

  res.write(output)
  res.end()
}

const sms = async (req, res) => {
  const { From, Body, To, NumMedia } = req.body

  const user = await promisify(User.getOrCreateByPhoneNumber)(From)

  if (!user.brand) {
    const root = await Brand.getDefault()

    const brand = await Brand.create({
      name: `${From}'s Team`,
      brand_type: 'Personal',
      parent: root.id
    })

    const role = await BrandRole.create({
      role: 'Agent',
      acl: ['Marketing', 'CRM'],
      brand: brand.id
    })

    await BrandRole.addMember({
      user: user.id,
      role: role.id
    })


    await promisify(User.patch)(user.id, {
      ...user,
      brand: brand.id
    })
  }

  const files = []

  const media_count = NumMedia

  for(let i = 0; i < media_count; i++) {
    const mime = req.body['MediaContentType' + i]
    const ext = Mime.getExtension(mime)

    const file = await promisify(AttachedFile.saveFromUrl)({
      url: req.body['MediaUrl' + i],
      filename: i + '.' + ext,
      relations: [{
        role: 'User',
        role_id: user.id
      }],
      path: `${user.id}/templates/assets`,
      user
    })

    files.push(file)
  }

  const listingNotFound = async () => {
    Context.log('Responding Not Found')

    const sms = {
      from: To,
      to: From,
      body: 'We don\'t seem to have this listing. But you can always send a picture of your listing to this number.'
    }

    await promisify(Sms.send)(sms)
    res.end()
  }

  const [ listing ] = await Listing.stringSearch({
    limit: 1,
    query: Body
  })

  if (!listing && files.length < 1)
    return listingNotFound()

  const loginUrl = await User.getLoginLink({
    user,
    options: {
      action: 'OpenMarketingWizard',
      listing: listing?.id,
      files
    }
  })

  const name = user.first_name ? ` ${user.first_name}` : ''

  const asset = listing ? 'your listing' : 'your photo'

  const body = `Hi${name},
we‘ve prepared your designs for ${asset}. Tap on this link to view them:
${loginUrl}`

  const sms = {
    from: To,
    to: From,
    body
  }

  await promisify(Sms.send)(sms)

  res.end()
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  const urlEncoded = bodyParser.urlencoded({
    extended: true,
    limit: '3mb'
  })

  app.post('/templates', b, am(create))
  app.get('/brands/:brand/templates', b, am(getForBrand))
  app.delete('/brands/:brand/templates/:id', b, am(deleteTemplate))
  app.post('/brands/:brand/templates/thumbnails/invalidate', b, am(invalidateThumbnails))

  app.post('/templates/:id/instances', b, am(instantiate))
  app.post('/templates/:id/render', b, am(render))
  app.get('/templates/instances', b, am(getInstances))
  app.get('/templates/instances/:instance', b, am(getInstance))
  app.post('/templates/instances/:instance/share', b, am(share))
  app.delete('/templates/instances/:instance', b, am(deleteInstance))

  app.post('/templates/assets', b, am(createAsset))

  app.post('/templates/sms', urlEncoded, am(sms))
}

module.exports = router
