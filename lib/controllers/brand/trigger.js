const BrandTrigger = {
  ...require('../../models/Trigger/brand_trigger/create'),
  ...require('../../models/Trigger/brand_trigger/update'),
  ...require('../../models/Trigger/brand_trigger/get'),
}
const AttributeDef = require('../../models/Contact/attribute_def/get')
const expect = require('../../utils/validator').expect

/** @typedef {any} BrandTrigger */
/** @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest<any, any, any>} IAuthenticatedRequest */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */
/** @typedef {(req: IAuthenticatedRequest, res: IResponse) => Promise<void>} ApiHandler */

/** @param {string} eventType */
async function validateEventType (eventType) {
  const globalDefIds = await AttributeDef.getGlobalDefs()
  const globalAttrs = await AttributeDef.getAll(globalDefIds)
  const eventTypes = globalAttrs.map(ga => ga.name)

  expect(eventType, 'Invalid event type').to.be.oneOf(eventTypes)
}

/** @param {BrandTrigger} bt */
async function validateForUpsert (bt) {
  if (!bt.template === !bt.template_instance) {
    expect.fail('You must specify one of template and template_instance')
  } else if (bt.template) {
    expect(bt.template).to.be.uuid
  } else if (bt.template_instance) {
    expect(bt.template_instance).to.be.uuid
  }

  expect(bt.wait_for).to.satisfy(Number.isSafeInteger)
  expect(bt.subject).to.be.a('string')
  
  await validateEventType(bt.event_type)  
}

/** @type ApiHandler */
async function getTriggers (req, res) {
  const { brand } = req.params

  const brandTriggers = await BrandTrigger.getForBrand(brand)
  res.collection(brandTriggers)
}

/** @type ApiHandler */
async function upsertBrandTrigger (req, res) {
  const payload = {
    ...req.body,
    event_type: req.params.event_type,
    brand: req.params.brand,
    user: req.user.id,
  }

  await validateForUpsert(payload)
  const brandTriggerId = await BrandTrigger.upsert(payload)

  res.model(await BrandTrigger.get(brandTriggerId))
}

/** @type ApiHandler */
async function toggleBrandTrigger (req, res) {
  const { brand, brand_trigger, action } = req.params
  
  expect(action, 'Invalid action').to.be.oneOf(['enable', 'disable'])
  
  const numUpdates = await BrandTrigger.toggle({
    brandId: brand,
    brandTriggerId: brand_trigger,
    enable: action === 'enable',
  })

  if (numUpdates !== 1) {
    expect.fail('Invalid brand and/or brand trigger')
  }

  res.model(await BrandTrigger.get(brand_trigger))  
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
    '/brands/:brand/triggers/:brand_trigger/:action(^(enable|disable)$)',
    b, access,
    am(toggleBrandTrigger)
  )
}
