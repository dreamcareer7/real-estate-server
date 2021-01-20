const expect = require('../../utils/validator').expect
const am = require('../../utils/async_middleware')

const BrandFlow = {
  ...require('../../models/Brand/flow/create'),
  ...require('../../models/Brand/flow/access'),
  ...require('../../models/Brand/flow/get'),
  ...require('../../models/Brand/flow/upsert'),
}

const BrandFlowStep = {
  ...require('../../models/Brand/flow_step/create'),
  ...require('../../models/Brand/flow_step/get'),
  ...require('../../models/Brand/flow_step/manipulate'),
}

async function getFlows(req, res) {
  const brand_id = req.params.id
  expect(brand_id).to.be.uuid

  const flows = await BrandFlow.forBrand(brand_id)
  res.collection(flows)
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ flow: UUID; id: UUID; }, {}, {}>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function getFlowById(req, res) {
  const brand_id = req.params.id
  expect(brand_id).to.be.uuid

  const accessIndex = await BrandFlow.hasAccess(brand_id, 'read', [req.params.flow])

  if (!accessIndex.get(req.params.flow)) {
    throw Error.ResourceNotFound(`BrandFlow ${req.params.flow} not found.`)
  }

  const flow = await BrandFlow.get(req.params.flow)
  res.model(flow)
}

async function createFlow(req, res) {
  const brand_id = req.params.id
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
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ flow: UUID }, {}, import('../../models/Brand/flow/types').IBrandFlowInput>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function updateFlow(req, res) {
  await BrandFlow.update(req.user.id, req.params.flow, req.body)

  const updated = await BrandFlow.get(req.params.flow)

  res.model(updated)
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ flow: UUID }, {}, {}>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function deleteFlow(req, res) {
  await BrandFlow.delete(req.user.id, req.params.flow)

  res.status(204)
  res.end()
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID; step: UUID }, {}, import('../../models/Brand/flow_step/types').IBrandFlowStepInput>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function editStep(req, res) {
  await BrandFlowStep.update(req.user.id, req.params.step, req.body)

  const updated = await BrandFlowStep.get(req.params.step)

  res.model(updated)
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, { steps: Array<import('../../models/Brand/flow_step/types').IBrandFlowStepInput & { id: UUID }> }>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function bulkEditStep(req, res) {
  const steps = req.body.steps

  for (const step of steps) {
    await BrandFlowStep.update(req.user.id, step.id, step)
  }

  const updated = await BrandFlowStep.getAll(steps.map(s => s.id))

  res.collection(updated)
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ flow: UUID; id: UUID }, {}, { steps: import('../../models/Brand/flow_step/types').IBrandFlowStepInput[] }>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function addStepsToFlow(req, res) {
  const steps = req.body.steps
    ? req.body.steps.map(s => ({ ...s, flow: req.params.flow }))
    : []

  const ids = await BrandFlowStep.createAll(req.user.id, req.params.id, steps)
  const added = await BrandFlowStep.getAll(ids)

  res.collection(added)
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID, flow: UUID; step: UUID }, {}, {}>} req 
 * @param {import('../../../types/monkey/controller').IResponse} res 
 */
async function deleteStep(req, res) {
  await BrandFlowStep.delete(req.user.id, req.params.flow, req.params.step)

  res.status(204)
  res.end()
}
/**
 * @param {TAccessActions} op 
 */
function flowAccess(op) {
  /**
   * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ flow: UUID; id: UUID; }, {}, {}>} req 
   */
  async function _access(req, res, next) {
    const accessIndex = await BrandFlow.hasAccess(req.params.id, op, [req.params.flow])

    if (!accessIndex.get(req.params.flow)) {
      throw Error.ResourceNotFound(`BrandFlow ${req.params.flow} not found.`)
    }
    
    next()
  }

  return am(_access)
}

const router = function ({app, b, access, am}) {
  app.get('/brands/:id/flows', b, access, am(getFlows))
  app.get('/brands/:id/flows/:flow', b, access, flowAccess('read'), am(getFlowById))
  app.post('/brands/:id/flows', b, access, am(createFlow))
  app.put('/brands/:id/flows/:flow', b, access, flowAccess('write'), am(updateFlow))
  app.delete('/brands/:id/flows/:flow', b, access, flowAccess('write'), am(deleteFlow))

  app.post('/brands/:id/flows/:flow/steps', b, access, flowAccess('write'), am(addStepsToFlow))
  app.patch('/brands/:id/flows/:flow/steps', b, access, flowAccess('write'), am(bulkEditStep))
  app.put('/brands/:id/flows/:flow/steps/:step', b, access, flowAccess('write'), am(editStep))
  app.delete('/brands/:id/flows/:flow/steps/:step', b, access, flowAccess('write'), am(deleteStep))
}

module.exports = router
