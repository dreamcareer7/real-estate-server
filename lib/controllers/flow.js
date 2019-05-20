const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Brand = require('../models/Brand/index')
const Flow = require('../models/Flow')

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, IFlowEnrollInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function enroll(req, res) {
  const brand_id = getCurrentBrand()

  expect(req.body.origin).to.be.uuid
  expect(req.body.starts_at).to.be.a('number')
  expect(req.body.steps).to.be.an('array')
  expect(req.body.contacts).to.be.an('array')

  const flows = await Flow.enrollContacts(
    brand_id,
    req.user.id,
    req.body.origin,
    req.body.starts_at,
    req.body.steps,
    req.body.contacts
  )

  res.collection(flows)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function stop(req, res) {
  await Flow.stop(req.user.id, req.params.id)

  res.status(204)
  res.end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, { steps: UUID[] }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function enableSteps(req, res) {
  expect(req.body.steps).to.be.an('array')

  await Flow.enableSteps(req.user.id, req.params.id, req.body.steps)

  res.status(204)
  res.end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, { steps: UUID[] }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function disableSteps(req, res) {
  expect(req.body.steps).to.be.an('array')

  await Flow.disableSteps(req.user.id, req.params.id, req.body.steps)

  res.status(204)
  res.end()
}

const _access = async (req, res, next) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: getCurrentBrand()
  })

  next()
}

/**
 * @param {import('../../types/monkey/controller').IRechatApp} app 
 */
const router = function (app) {
  const b = app.auth.bearer.middleware
  const access = am(_access)

  app.post('/crm/flows', b, access, am(enroll))
  app.delete('/crm/flows/:id', b, access, am(stop))
  app.post('/crm/flows/:id/steps', b, access, am(enableSteps))
  app.delete('/crm/flows/:id/steps/:step', b, access, am(disableSteps))
}

module.exports = router
