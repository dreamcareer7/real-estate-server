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

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID; brand: UUID; }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function getFlowById(req, res) {
  const brand_id = req.params.brand
  expect(brand_id).to.be.uuid

  const accessIndex = await BrandFlow.hasAccess(brand_id, 'read', [req.params.id])

  if (!accessIndex.get(req.params.id)) {
    throw Error.ResourceNotFound(`BrandFlow ${req.params.id} not found.`)
  }

  const flow = await BrandFlow.get(req.params.id)
  res.model(flow)
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

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ brand: UUID; }, {}, {}>} req 
 */
const _access = async (req, res, next) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand
  })

  next()
}

/**
 * @param {TAccessActions} op 
 */
function flowAccess(op) {
  /**
   * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID; brand: UUID; }, {}, {}>} req 
   */
  async function _access(req, res, next) {
    const accessIndex = await BrandFlow.hasAccess(req.params.brand, op, [req.params.id])

    if (!accessIndex.get(req.params.id)) {
      throw Error.ResourceNotFound(`BrandFlow ${req.params.id} not found.`)
    }
    
    next()
  }

  return am(_access)
}

const router = function (app) {
  const b = app.auth.bearer.middleware
  const brandAccess = am(_access)

  app.get('/brands/:brand/flows', b, brandAccess, am(getFlows))
  app.get('/brands/:brand/flows/:id', b, brandAccess, flowAccess('read'), am(getFlowById))
  app.post('/brands/:brand/flows', b, brandAccess, am(createFlow))
  app.put('/brands/:brand/flows/:id', b, brandAccess, flowAccess('write'), am(updateFlow))

  app.post('/brands/:brand/flows/:id/steps', b, brandAccess, flowAccess('write'), am(addStepsToFlow))
  app.put('/brands/:brand/flows/:id/steps/:step', b, brandAccess, flowAccess('write'), am(editStep))
  app.delete('/brands/:brand/flows/:id/steps/:step', b, brandAccess, flowAccess('write'), am(deleteStep))
}

module.exports = router
