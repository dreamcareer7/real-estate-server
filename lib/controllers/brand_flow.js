const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Brand = require('../models/Brand/index')
const BrandFlow = require('../models/Brand/flow')


async function getFlows(req, res) {
  const brand_id = req.params.brand
  expect(brand_id).to.be.uuid

  const flows = await BrandFlow.forBrand(brand_id)
  res.collection(flows)
}

async function createFlow(req, res) {
  const brand_id = req.params.brand
  expect(brand_id).to.be.uuid

  expect(req.body.steps).to.be.an('array')

  const id = await BrandFlow.create(brand_id, req.user.id, {
    name: req.body.name,
    description: req.body.description,
    steps: req.body.steps
  })

  const flow = await BrandFlow.get(id)

  return res.model(flow)
}

const _access = async (req, res, next) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand
  })

  next()
}

const router = function (app) {
  const b = app.auth.bearer.middleware
  const access = am(_access)

  app.get('/brands/:brand/flows', b, access, am(getFlows))
  app.post('/brands/:brand/flows', b, access, am(createFlow))
}

module.exports = router
