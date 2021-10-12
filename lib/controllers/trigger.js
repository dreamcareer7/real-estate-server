const am = require('../utils/async_middleware')

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
}

const Trigger = {
  ...require('../models/Trigger/create'),
  ...require('../models/Trigger/update'),
  ...require('../models/Trigger/delete'),
  ...require('../models/Trigger/get'),
  ...require('../models/Trigger/validate'),
}

const BrandTrigger = require('../models/Trigger/brand_trigger/exclusions')

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
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, import('../models/Trigger/trigger').ITriggerEndpointInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function createTrigger(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const data = {
    ...req.body,
    created_by: user_id,
    brand: brand_id
  }

  // make sure users can't create a trigger that references a flow
  // @ts-ignore
  delete data.flow
  // @ts-ignore
  delete data.flow_step

  try {
    await Trigger.validateForCreate(data)
  } catch (ex) {
    throw Error.Forbidden(ex)
  }

  const [id] = await Trigger.create([data])
  const trigger = await Trigger.get(id)

  res.model(trigger)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, import('../models/Trigger/trigger').ITriggerUpdateInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function updateTrigger(req, res) {
  const trigger = await Trigger.get(req.params.id)

  /** @type {import('../models/Trigger/trigger').ITriggerUpdateInput} */
  const current_values = {
    event_type: trigger.event_type,
    user: trigger.user,
    recurring: trigger.recurring,
    time: trigger.time,
    wait_for: trigger.wait_for,
  }

  if (trigger.action === 'create_event') {
    current_values.brand_event = trigger.brand_event
  }

  if (trigger.action === 'schedule_email') {
    current_values.campaign = trigger.campaign
  }
  
  /** @type {import('../models/Trigger/trigger').ITriggerUpdateInput} */
  const data = {
    ...current_values,
    ...req.body
  }

  try {
    await Trigger.validateForUpdate(data, trigger)
  } catch (ex) {
    throw Error.Forbidden(ex)
  }

  await Trigger.update(req.params.id, data)
  const updated = await Trigger.get(trigger.id)
  if (updated.origin) {
    await Trigger.deleteOrigin(req.params.id)
    await BrandTrigger.makeExclusion(updated.origin, [updated.contact])
  }
  res.model(updated)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function deleteTrigger(req, res) {
  const trigger = await Trigger.get(req.params.id)
  const brand = getCurrentBrand()

  if (trigger.brand !== brand) {
    throw Error.ResourceNotFound(`Trigger '${req.params.id}' not found.`)
  }

  await Trigger.delete([trigger.id], req.user.id)

  res.status(204)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/triggers', auth, brandAccess, am(createTrigger))
  app.delete('/triggers/:id', auth, brandAccess, am(deleteTrigger))
  app.patch('/triggers/:id', auth, brandAccess, am(updateTrigger))
}

module.exports = router
