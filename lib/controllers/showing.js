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
  ...require('../models/Showing/appointment/token'),
}
const Approval = require('../models/Showing/approval/patch')

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
  res.model(await Appointment.get(id))
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

  await Approval.patch(req.user.id, appointment, req.body)
  res.status(204)
  res.end()
}

/**
 * @param {IAuthenticatedRequest<{ token: string }, {}, { message: string }>} req
 * @param {IResponse} res
 */
async function cancelAppointmentByBuyer(req, res) {
  const id = Appointment.decodeToken(req.params.token)
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
  app.post('/showings/public/appointments/:token/cancel', am(cancelAppointmentByBuyer))

  app.post('/showings/filter', auth, brandAccess, am(filterShowings))
  app.post('/showings', auth, brandAccess, am(createShowing))
  app.get('/showings/:id', auth, showingAccess, am(getShowing))
  app.post('/showings/:id/appointments/:appointment/cancel', auth, showingAccess, am(cancelAppointmentByRole))
  app.put('/showings/:id/appointments/:appointment/approval', auth, showingAccess, am(changeAppointmentApproval))

}

module.exports = router
