const am = require('../utils/async_middleware.js')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/create')
}

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 */

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Email/super_campaign/types').SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function create(req, res) {
  const id = await SuperCampaign.create(req.body, req.user.id, getCurrentBrand())

  const created = await SuperCampaign.get(id)

  return res.model(created)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/email/super_campaigns', auth, brandAccess, am(create))
}

module.exports = router
