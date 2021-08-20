const BrandTrigger = require('../../models/Trigger/brand_trigger/get')

/** @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest} IAuthenticatedRequest */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */
/** @typedef {(req: IAuthenticatedRequest, res: IResponse) => Promise<void>} ApiHandler */

/** @type ApiHandler */
async function getTriggers (req, res) {
  const userId = req.user.id
  const brandId = req.params.brand

  const brandTriggers = await BrandTrigger.getForBrandAndUser(brandId, userId)
  res.collection(brandTriggers)
}

/** @type ApiHandler */
async function upsertBrandTrigger (req, res) {
  res.sendStatus(501)
}

/** @type ApiHandler */
async function toggleBrandTrigger (req, res) {
  res.sendStatus(501)
}

module.exports = function brandTriggerRouter ({ app, b, access, am }) {
  app.get(
    '/brands/:brand/triggers',
    b, access,
    am(getTriggers)
  )
  
  app.put(
    '/brands/:brand/triggers/:event_type',
    b, access,
    am(upsertBrandTrigger)
  )
  
  app.patch(
    '/brands/:brand/triggers/:id/:action(^(enable|disable)$)',
    b, access,
    am(toggleBrandTrigger)
  )
}
