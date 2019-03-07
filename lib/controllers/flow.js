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

async function enroll(req, res) {
  const brand_id = getCurrentBrand()

  expect(req.body.origin).to.be.uuid
  expect(req.body.starts_at).to.be.a('number')
  expect(req.body.steps).to.be.an('array')
  expect(req.body.contacts).to.be.an('array')

  Flow.enrollContacts(
    brand_id,
    req.user.id,
    req.body.origin,
    req.body.starts_at,
    req.body.steps,
    req.body.contacts
  )
}

const _access = async (req, res, next) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: getCurrentBrand()
  })

  next()
}

const router = function (app) {
  const b = app.auth.bearer.middleware
  const access = am(_access)

  app.post('/crm/flows', b, access, am(enroll))
}

module.exports = router
