const Brand = require('../models/Brand/index.js')
const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')
const Showing = {
  ...require('../models/Showing/showing/access'),
  ...require('../models/Showing/showing/create'),
  ...require('../models/Showing/showing/filter'),
  ...require('../models/Showing/showing/get'),
  ...require('../models/Showing/showing/update'),
  ...require('../models/Showing/showing/notifications'),
}
const ShowingRole = {
  ...require('../models/Showing/role/create'),
  ...require('../models/Showing/role/delete'),
  ...require('../models/Showing/role/get'),
  ...require('../models/Showing/role/update'),
}
const Appointment = {
  ...require('../models/Showing/appointment/cancel'),
  ...require('../models/Showing/appointment/create'),
  ...require('../models/Showing/appointment/feedback'),
  ...require('../models/Showing/appointment/get'),
  ...require('../models/Showing/appointment/reschedule'),
  ...require('../models/Showing/appointment/token'),
  ...require('../models/Showing/appointment/notification'),
}
const Approval = require('../models/Showing/approval/patch')
const Crypto = require('../models/Crypto')
const ShowingHub = require('../models/Showing/showinghub/events')

const BrandWebhook = {
  ...require('../models/Brand/webhook/trigger')
}

/**
 * @template P
 * @template Q
 * @template B
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<P, Q, B>} IAuthenticatedRequest<P, Q, B>
 */

/**
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 */

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (brand?.id) { return brand.id }

  throw Error.BadRequest('Brand is not specified.')
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).then(() => next(), next)
}

function showingAccess(req, res, next) {
  Showing.hasAccess(req.params.id, req.user.id).then(
    access => {
      if (access) { return next() }
      
      next(Error.Forbidden('Access to the showing is forbidden'))
    },
    next,
  )
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req
 * @param {IResponse} res
 */
async function getShowing(req, res) {
  expect(req.params.id).to.be.uuid
  const showing = await Showing.get(req.params.id)
  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, import('../models/Showing/showing/types').ShowingInput>} req
 * @param {IResponse} res
 */
async function updateShowing(req, res) {
  expect(req.params.id).to.be.uuid

  await Showing.update(req.params.id, req.body, req.user.id)
  res.model(await Showing.get(req.params.id))
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, import('../models/Showing/role/types').ShowingRoleInput>} req
 * @param {IResponse} res
 */
async function addRole(req, res) {
  expect(req.params.id).to.be.uuid

  const [id] = await ShowingRole.create(req.user.id, req.params.id, [req.body])
  res.model(await ShowingRole.get(id))
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID; role: UUID; }, {}, import('../models/Showing/role/types').ShowingRoleInput>} req
 * @param {IResponse} res
 */
async function updateRole(req, res) {
  expect(req.params.id).to.be.uuid

  const role = await ShowingRole.get(req.params.role)
  if (role.showing !== req.params.id) {
    throw Error.ResourceNotFound('Showing role does not exist.')
  }

  await ShowingRole.update(req.params.role, req.body)
  res.model(await Showing.get(req.params.id))
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID; role: UUID; }, {}, {}>} req
 * @param {IResponse} res
 */
async function deleteRole(req, res) {
  expect(req.params.role).to.be.uuid

  const role = await ShowingRole.get(req.params.role)
  if (role.showing !== req.params.id) {
    throw Error.ResourceNotFound('Showing role does not exist.')
  }

  await ShowingRole.delete(req.params.role)
  res.status(204)
  res.end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID; appointment: UUID; }, {}, {}>} req
 * @param {IResponse} res
 */
async function getAppointment(req, res) {
  expect(req.params.id).to.be.uuid
  const showing = await Showing.get(req.params.id)

  expect(req.params.appointment).to.be.uuid
  const appointment = await Appointment.get(req.params.appointment)
  
  try {
    expect(appointment.showing).to.be.eq(showing.id)
  } catch (ex) {
    throw Error.ResourceNotFound('Appointment not found')
  }

  res.model(appointment)
}

/**
 * @param {IAuthenticatedRequest<{ id: string }, {}, {}>} req
 * @param {IResponse} res
 */
async function getShowingForBuyer(req, res) {
  const [ showing ] = await Showing.getAllForBuyer([parseInt(req.params.id)])

  if (!showing) {
    throw Error.ResourceNotFound('Showing not found!')
  }

  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types').ShowingFilterOptions>} req
 * @param {IResponse} res
 */
async function filterShowings(req, res) {
  const brand = getCurrentBrand()

  const { ids, total } = await Showing.filter({
    parentBrand: brand,
    deal: req.body.deal,
    listing: req.body.listing,
    live: req.body.live,
    query: req.body.query,
  })
  if (!ids.length) { return res.collection([]) }

  const rows = await Showing.getAll(ids)
  if (!rows.length) { return res.collection([]) }

  // @ts-ignore
  rows[0].total = total

  await res.collection(rows)
}

/**
 * @param {IAuthenticatedRequest<{}, { limit?: number; }, {}>} req
 * @param {IResponse} res
 * @returns 
 */
async function getAllShowingNotifications(req, res) {
  const notifications = await Showing.getUnreadNotifications(req.user.id, { limit: req.query.limit })

  return res.collection(notifications)
}

async function webhook(showing, event = 'showing.updated') {
  await BrandWebhook.trigger({
    brand: getCurrentBrand(), 
    payload: { showing }, 
    event,
    topic: 'Showings',
    withParents: false
  })
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types').ShowingInput>} req
 * @param {IResponse} res
 */
async function createShowing(req, res) {
  const brand = getCurrentBrand()
  const user = req.user.id

  const id = await Showing.create(req.body, user, brand)
  const showing = await Showing.get(id)

  await webhook(showing, 'showing.created')

  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{ id: string }, {}, import('../models/Showing/appointment/types').ShowingAppointmentRequestPayload>} req
 * @param {IResponse} res
 */
async function requestAppointment(req, res) {
  const showing_id = await Showing.getByHumanReadableId(parseInt(req.params.id))
  const id = await Appointment.request(showing_id, req.body)
  const [appointment] = await Appointment.getAllPublic([id])

  res.model(appointment)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID; appointment: UUID; }, {}, import('../models/Showing/approval/types').ShowingApprovalInput>} req
 * @param {IResponse} res
 */
async function changeAppointmentApproval(req, res) {
  const appointment = await Appointment.get(req.params.appointment)
  if (!appointment || appointment.showing !== req.params.id) {
    throw Error.ResourceNotFound('The appointment was not found.')
  }

  expect(req.body, 'Approval type can only have `approved` and `comment` keys.').to.include.keys('approved')

  await Approval.patch(req.user.id, appointment.id, req.body)
  const updated = await Appointment.get(req.params.appointment)
  await Appointment.clearNotifications(req.user.id, req.params.appointment)

  res.model(updated)
}

/**
 * @param {*} req
 * @param {IResponse} res
 */
async function changeAppointmentApprovalViaToken (req, res) {
  const comment = req.body.message
  const actionParam = req.params.action
  const { id, user, action, time } = Crypto.decryptJSON(req.params.token)
  
  expect(id).to.be.uuid
  expect(user).to.be.uuid
  expect(actionParam).to.be.oneOf(['confirm', 'cancel', 'reject'])
  expect(actionParam, 'Invalid action').to.be.equal(action)
  
  const appointment = await Appointment.get(id)
  if (!appointment) {
    throw Error.ResourceNotFound('The appointment was not found.')
  }

  expect(appointment.time.toISOString(), 'The link has expired!').to.be.equal(time)

  const status = appointment.status
  const isCancel = action === 'cancel'
  const confirmable = ['Requested', 'Rescheduled'].includes(status)
  if ((isCancel && status !== 'Confirmed') || (!isCancel && !confirmable)) {
    throw Error.BadRequest(`You cannot ${action} this appointment`)
  }

  const approval = { approved: action === 'confirm', comment }
  await Approval.patch(user, appointment.id, approval)
  
  const updated = await Appointment.get(id)
  await Appointment.clearNotifications(user, id)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ token: string }, {}, {}>} req
 * @param {IResponse} res
 */
async function getAppointmentViaPublicLink(req, res) {
  const { id } = Crypto.decryptJSON(req.params.token)
  expect(id).to.be.uuid
  const rows = await Appointment.getAllPublic([id])
  const appointment = rows[0]
  if (!appointment) {
    throw Error.ResourceNotFound('Appointment not found!')
  }

  res.model(appointment)
}

/**
 * @param {IAuthenticatedRequest<{ token: string }, {}, { message: string; time: string; }>} req
 * @param {IResponse} res
 */
async function rescheduleAppointment(req, res) {
  const { id, time } = Crypto.decryptJSON(req.params.token)
  expect(id).to.be.uuid
  const appointment = await Appointment.get(id)
  expect(appointment.time.toISOString(), 'The link has expired!').to.be.equal(time)

  try {
    await Appointment.reschedule(id, req.body.time, req.body.message)
  } catch (ex) {
    throw Error.Validation(ex.message)
  }

  const [updated] = await Appointment.getAllPublic([id])
  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ token: string }, {}, import('../models/Showing/appointment/types').AppointmentFeedback>} req
 * @param {IResponse} res
 */
async function appointmentFeedback(req, res) {
  const { id, time } = Crypto.decryptJSON(req.params.token)
  expect(id).to.be.uuid
  const appointment = await Appointment.get(id)
  expect(appointment.time.toISOString(), 'The link has expired!').to.be.equal(time)

  // FIXME: enable this once appointments can go to the completed state
  // expect(appointment.status, 'Feedback is only for completed appointments.').to.be.eq('Completed')

  await Appointment.setFeedback(id, req.body)
  res.status(204)
  res.end()
}

/**
 * @param {IAuthenticatedRequest<{ token: string }, {}, { message: string }>} req
 * @param {IResponse} res
 */
async function cancelAppointmentViaPublicLink(req, res) {
  const { id, time, role } = Crypto.decryptJSON(req.params.token)
  expect(id).to.be.uuid
  const appointment = await Appointment.get(id)
  expect(appointment.time.toISOString(), 'The link has expired!').to.be.equal(time)

  if (role) {
    expect(role, 'Invalid link').to.be.uuid
  }

  await Appointment.cancel(id, req.body.message)
  res.status(204)
  res.end()
}

async function handleShowingHubWebhooks(req, res) {
  const sql = require('../utils/sql')

  if (req.params.appid) {
    await sql.query('INSERT INTO showinghub_webhooks (app_id, payload) VALUES ($1::uuid, $2::json)', [
      req.params.appid,
      JSON.stringify(req.body)
    ])
  } else {
    await sql.query('INSERT INTO showinghub_webhooks (payload) VALUES ($1::json)', [
      JSON.stringify(req.body)
    ])
  }

  await ShowingHub.webhook.handle(req.params.appid || null, req.body)

  res.status(204)
  res.end()
}

/**
 * @param {import('../../types/monkey/controller').IRechatApp} app
 */
const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/showings/public/:id', am(getShowingForBuyer))
  app.post('/showings/public/:id/appointments', am(requestAppointment))
  app.get('/showings/public/appointments/:token', am(getAppointmentViaPublicLink))
  app.post('/showings/public/appointments/:token/cancel', am(cancelAppointmentViaPublicLink))
  app.post('/showings/public/appointments/:token/reschedule', am(rescheduleAppointment))
  app.post('/showings/public/appointments/:token/feedback', am(appointmentFeedback))

  app.post('/showings/hub/hooks', am(handleShowingHubWebhooks))
  app.post('/showings/hub/hooks/:appid', am(handleShowingHubWebhooks))

  app.put('/showings/public/appointments/:token/approval/:action', am(changeAppointmentApprovalViaToken))

  app.post('/showings/filter', auth, brandAccess, am(filterShowings))
  app.get('/showings/notifications', auth, brandAccess, am(getAllShowingNotifications))
  app.post('/showings', auth, brandAccess, am(createShowing))
  app.get('/showings/:id', auth, showingAccess, am(getShowing))
  app.put('/showings/:id', auth, showingAccess, am(updateShowing))
  app.post('/showings/:id/roles', auth, showingAccess, am(addRole))
  app.put('/showings/:id/roles/:role', auth, showingAccess, am(updateRole))
  app.delete('/showings/:id/roles/:role', auth, showingAccess, am(deleteRole))
  app.get('/showings/:id/appointments/:appointment', auth, showingAccess, am(getAppointment))
  app.put('/showings/:id/appointments/:appointment/approval', auth, showingAccess, am(changeAppointmentApproval))
}

module.exports = router
