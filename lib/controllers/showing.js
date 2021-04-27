const Brand = require('../models/Brand/index.js')
const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')
const Showing = {
  ...require('../models/Showing/showing/access'),
  ...require('../models/Showing/showing/create'),
  ...require('../models/Showing/showing/filter'),
  ...require('../models/Showing/showing/get'),
  ...require('../models/Showing/showing/token'),
  ...require('../models/Showing/showing/validate'),
}
const Appointment = {
  ...require('../models/Showing/appointment/cancel'),
  ...require('../models/Showing/appointment/create'),
  ...require('../models/Showing/appointment/get'),
  ...require('../models/Showing/appointment/reschedule'),
  ...require('../models/Showing/appointment/token'),
}
const Approval = require('../models/Showing/approval/patch')
const Crypto = require('../models/Crypto.js')

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

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify((err) => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function showingAccess(req, res, next) {
  const user = req.user.id

  Showing.hasAccess(req.params.id, user).nodeify((err, access) => {
    if (err) {
      return res.error(err)
    }

    if (!access) {
      throw Error.Forbidden('Access to the showing is forbidden')
    }

    next()
  })
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
 * @param {IAuthenticatedRequest<{ token: string }, {}, {}>} req
 * @param {IResponse} res
 */
async function getShowingForBuyer(req, res) {
  const showing_id = Showing.decodeToken(req.params.token)
  const [ showing ] = await Showing.getAllForBuyer([showing_id])

  if (!showing) {
    throw Error.ResourceNotFound('Showing not found!')
  }

  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types.js').ShowingFilterOptions>} req
 * @param {IResponse} res
 */
async function filterShowings(req, res) {
  const brand = getCurrentBrand()

  const { ids, total } = await Showing.filter(brand, {
    deal: req.body.deal,
    listing: req.body.listing,
    live: req.body.live,
  })

  const rows = await Showing.getAll(ids)
  if (rows.length === 0) {
    res.collection([])
  } else {
    // @ts-ignore
    rows[0].total = total

    await res.collection(rows)
  }
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types').ShowingInput>} req
 * @param {IResponse} res
 */
async function createShowing(req, res) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Showing.validate(req.body)
  const id = await Showing.create(req.body, user, brand)
  res.model(await Showing.get(id))
}

/**
 * @param {IAuthenticatedRequest<{ token: UUID }, {}, import('../models/Showing/appointment/types').ShowingAppointmentRequestPayload>} req
 * @param {IResponse} res
 */
async function requestAppointment(req, res) {
  const showing_id = Showing.decodeToken(req.params.token)
  const id = await Appointment.request(showing_id, req.body)
  const [appointment] = await Appointment.getAllPublic([id])
  res.model(appointment)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID; appointment: UUID; }, {}, import('../models/Showing/approval/types.js').ShowingApprovalInput>} req
 * @param {IResponse} res
 */
async function changeAppointmentApproval(req, res) {
  const appointment = await Appointment.get(req.params.appointment)
  if (!appointment || appointment.showing !== req.params.id) {
    throw Error.ResourceNotFound('The appointment was not found.')
  }

  expect(req.body, 'Approval type can only have `approved` and `comment` keys.').to.have.key('approved')

  await Approval.patch(req.user.id, appointment.id, req.body)
  res.status(204)
  res.end()
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
  expect(appointment.time, 'The link has expired!').to.be.equal(time)

  await Appointment.reschedule(id, req.body.time, req.body.message)
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

/**
 * @param {IAuthenticatedRequest<{ id: UUID; appointment: UUID; }, {}, { message: string }>} req
 * @param {IResponse} res
 */
async function cancelAppointmentByRole(req, res) {
  const appointment = await Appointment.get(req.params.appointment)
  if (!appointment || appointment.showing !== req.params.id) {
    throw Error.ResourceNotFound('The appointment was not found.')
  }
  await Appointment.cancel(appointment.id, req.body.message)
  res.status(204)
  res.end()
}

/**
 * @param {import('../../types/monkey/controller').IRechatApp} app
 */
const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/showings/public/:token', am(getShowingForBuyer))
  app.post('/showings/public/:token/appointments', am(requestAppointment))
  // TODO: there should be a web page asking for confirmation
  app.get('/showings/public/appointments/:token', am(getAppointmentViaPublicLink))
  app.post('/showings/public/appointments/:token/cancel', am(cancelAppointmentViaPublicLink))
  app.post('/showings/public/appointments/:token/reschedule', am(rescheduleAppointment))

  app.post('/showings/filter', auth, brandAccess, am(filterShowings))
  app.post('/showings', auth, brandAccess, am(createShowing))
  app.get('/showings/:id', auth, showingAccess, am(getShowing))
  app.get('/showings/:id/appointments/:appointment', auth, showingAccess, am(getAppointment))
  app.post('/showings/:id/appointments/:appointment/cancel', auth, showingAccess, am(cancelAppointmentByRole))
  app.put('/showings/:id/appointments/:appointment/approval', auth, showingAccess, am(changeAppointmentApproval))
}

module.exports = router
