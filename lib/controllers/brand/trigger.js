const BrandTrigger = {
  ...require('../../models/Trigger/brand_trigger/create'),
  ...require('../../models/Trigger/brand_trigger/update'),
  ...require('../../models/Trigger/brand_trigger/get'),
}
const AttributeDef = require('../../models/Contact/attribute_def/get')

/** @typedef {import('../../models/Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */
/** @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest<any, any, any>} IAuthenticatedRequest */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */
/** @typedef {(req: IAuthenticatedRequest, res: IResponse) => Promise<void>} ApiHandler */

/** @param {string} eventType */
async function validateEventType (eventType) {
  const attrDefIds = await AttributeDef.getGlobalDefs()
  const attrDefs = await AttributeDef.getAll(attrDefIds)
  
  if (!attrDefs.some(ad => ad.data_type === 'date' && ad.name === eventType)) {
    throw Error.Validation('Invalid event type')
  }
}

/** @type ApiHandler */
async function getTriggers (req, res) {
  const { id: brand } = req.params

  const brandTriggers = await BrandTrigger.getForBrand(brand)
  res.collection(brandTriggers)
}

/** @type ApiHandler */
async function upsertBrandTrigger (req, res) {
  const payload = {
    ...req.body,
    event_type: req.params.event_type,
    brand: req.params.id,
    created_by: req.user.id,
  }

  await validateEventType(payload.event_type)
  const brandTriggerId = await BrandTrigger.upsert(payload)

  res.model(await BrandTrigger.get(brandTriggerId))
}

/** @type ApiHandler */
async function toggleBrandTrigger (req, res) {
  const { id: brand, brand_trigger, action } = req.params

  const bt = await BrandTrigger.get(brand_trigger)
  if (bt?.brand !== brand) {
    throw Error.Validation('Invalid brand and/or brand trigger')
  }
  
  await BrandTrigger.toggle(brand_trigger, action === 'enable')

  res.model(await BrandTrigger.get(brand_trigger))  
}

module.exports = function brandTriggerRouter ({ app, b, access, am }) {
  app.get(
    '/brands/:id/triggers',
    b, access,
    am(getTriggers)
  )
  
  app.put(
    '/brands/:id/triggers/:event_type',
    b, access,
    am(upsertBrandTrigger)
  )
  
  app.patch(
    '/brands/:id/triggers/:brand_trigger/:action(^(enable|disable)$)',
    b, access,
    am(toggleBrandTrigger)
  )
}
