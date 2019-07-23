const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Brand = require('../models/Brand/index')
const BrandFlow = require('../models/Brand/flow')
const BrandFlowStep = require('../models/Brand/flow_step')


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

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, IBrandFlowInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function updateFlow(req, res) {
  await BrandFlow.update(req.user.id, req.params.id, req.body)

  const updated = await BrandFlow.get(req.params.id)

  res.model(updated)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID; step: UUID }, {}, IBrandFlowStepInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function editStep(req, res) {
  await BrandFlowStep.update(req.user.id, req.params.step, req.body)

  const updated = await BrandFlowStep.get(req.params.step)

  res.model(updated)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID; brand: UUID }, {}, { steps: IBrandFlowStepInput[] }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function addStepsToFlow(req, res) {
  const steps = req.body.steps
    ? req.body.steps.map(s => ({ ...s, flow: req.params.id }))
    : []

  const ids = await BrandFlowStep.createAll(req.user.id, req.params.brand, steps)
  const added = await BrandFlowStep.getAll(ids)

  res.collection(added)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID, flow: UUID; step: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function deleteStep(req, res) {
  await BrandFlowStep.delete(req.user.id, req.params.flow, req.params.step)

  res.status(204)
  res.end()
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
  app.put('/brands/:brand/flows/:id', b, access, am(updateFlow))

  app.post('/brands/:brand/flows/:id/steps', b, access, am(addStepsToFlow))
  app.put('/brands/:brand/flows/:id/steps/:step', b, access, am(editStep))
  app.delete('/brands/:brand/flows/:id/steps/:step', b, access, am(deleteStep))
}

module.exports = router
