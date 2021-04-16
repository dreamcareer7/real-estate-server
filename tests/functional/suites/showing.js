const merge = require('deepmerge')
const moment = require('moment-timezone')

const ShowingToken = require('../../../lib/models/Showing/showing/token')

registerSuite('brand', ['createParent', 'attributeDefs', 'createBrandLists', 'create', 'addRole', 'addMember'])

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])
registerSuite('listing', ['getListing'])

function _create(description, override, cb) {
  /** @type {import("../../../lib/models/Showing/showing/types").ShowingInput} */
  const showing = {
    approval_type: 'All',
    availabilities: [
      {
        weekday: 'Monday',
        availability: [7 * 3600, 10 * 3600],
      },
    ],
    aired_at: new Date().toISOString(),
    duration: 15 * 60,
    allow_appraisal: true,
    allow_inspection: true,
    instructions: 'The key is in the locker',
    same_day_allowed: true,
    roles: [
      {
        brand: results.brand.create.data.id,
        can_approve: true,
        role: 'SellerAgent',
        cancel_notification_type: ['email'],
        confirm_notification_type: ['push', 'email'],
        first_name: 'John',
        last_name: 'Doe',
        email: results.authorize.token.data.email,
        phone_number: results.authorize.token.data.phone_number,
        user: results.authorize.token.data.id,
      },
    ],
    start_date: new Date().toISOString(),
    listing: results.listing.getListing.data.id,
    notice_period: 3 * 3600,
  }

  return frisby
    .create(description)
    .post('/showings?associations[]=showing.roles&associations[]=showing.availabilities', merge(showing, override))
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
}

function create(cb) {
  return _create('create a showing', { same_day_allowed: true }, function (err, res, json) {
    const setup = frisby.globalSetup()

    setup.request.headers['X-RECHAT-BRAND'] = results.brand.create.data.id
    setup.request.headers['x-handle-jobs'] = 'yes'

    frisby.globalSetup(setup)

    cb(err, res, json)
  })
    .expectStatus(200)
    .expectJSON({
      data: {
        type: 'showing',
        roles: [
          {
            first_name: 'John',
            last_name: 'Doe',
          },
        ],
      },
    })
}

function createWithValidationError(cb) {
  return _create(
    'create a showing with invalid data',
    {
      availabilities: [
        {
          weekday: 'Monday',
          availability: [7 * 3600, 10 * 3600],
        },
        {
          weekday: 'Monday',
          availability: [7 * 3600, 10 * 3600],
        },
      ],
    },
    cb
  ).expectStatus(400)
}

function getShowing(cb) {
  return frisby
    .create('get a showing by id')
    .get(`/showings/${results.showing.create.data.id}`)
    .after(cb)
    .expectJSON({
      data: {
        type: 'showing',
      },
    })
}

function filter(cb) {
  return frisby
    .create('get all showings')
    .post('/showings/filter?associations[]=showing.availabilities&associations[]=showing.roles')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [results.showing.create.data],
    })
}

function filterByStatus(cb) {
  return frisby
    .create('filter showings by status')
    .post('/showings/filter?associations[]=showing.availabilities&associations[]=showing.roles', {
      status: 'Approved',
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [],
    })
}

function getShowingPublic(cb) {
  const showing_token = ShowingToken.encodeToken(results.showing.create.data)
  return frisby
    .create('get showing public info')
    .get(`/showings/public/${showing_token}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        id: results.showing.create.data.id,
        type: 'showing_public',
      },
    })
}

function _makeAppointment(msg) {
  return (cb) => {
    const showing_token = ShowingToken.encodeToken(results.showing.create.data)
    return frisby
      .create(msg)
      .post(
        `/showings/public/${showing_token}/appointments?associations[]=showing_appointment.contact&associations[]=showing_appointment.showing`,
        {
          source: 'Website',
          time: moment().tz('America/Chicago').startOf('hour').day(8).hour(9).format(),
          contact: {
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@gmail.com',
          },
        }
      )
      .removeHeader('X-RECHAT-BRAND')
      .removeHeader('Authorization')
      .after(cb)
      .expectStatus(200)
      .expectJSON({
        data: {
          showing: {
            id: results.showing.create.data.id,
          },
          contact: {
            type: 'contact',
          },
        },
      })
  }
}

// function checkAppointmentNotifications(cb) {
//   const appt = results.showing.requestAppointment.data
//   return frisby
//     .create('check appointment request notification')
//     .get('/notifications')
//     .after(cb)
//     .expectJSON({
//       data: [
//         {
//           object_class: 'ShowingAppointment',
//           object: appt.id,
//           action: 'Created',
//           subject_class: 'Contact',
//           title: '5020  Junius Street',
//           message: 'John Smith requested a showing',
//           type: 'notification',
//         },
//       ],
//     })
// }

function upcomingAppointments(cb) {
  const low = moment().startOf('day').unix()
  const high = moment().add(20, 'day').startOf('day').unix()

  return frisby
    .create('View upcoming appointments')
    .get(`/calendar?object_types[]=showing_appointment&low=${low}&high=${high}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          type: 'calendar_event',
        },
      ],
    })
}

function buyerAgentGetAppointment(cb) {
  const appt = results.showing.requestAppointment.data
  return frisby
    .create('get an appointment by buyer agent')
    .get(`/showings/public/appointments/${appt.id}`)
    .removeHeader('X-RECHAT-BRAND')
    .removeHeader('Authorization')
    .after(cb)
    .expectJSON({
      data: {
        id: appt.id,
        status: appt.status
      }
    })
}

function buyerAgentCancelAppointment(cb) {
  const appt = results.showing.requestAppointment.data
  return frisby
    .create('cancel an appointment by buyer agent')
    .post(`/showings/public/appointments/${appt.id}/cancel`, {
      message: 'Sorry something came up',
    })
    .removeHeader('X-RECHAT-BRAND')
    .removeHeader('Authorization')
    .after(cb)
    .expectStatus(204)
}

// function checkBuyerCancelNotifications(cb) {
//   const appt = results.showing.requestAppointment.data
//   return frisby
//     .create('check buyer cancelled notification')
//     .get('/notifications')
//     .after(cb)
//     .expectJSON({
//       data: [
//         {
//           object_class: 'ShowingAppointment',
//           object: appt.id,
//           action: 'Cancelled',
//           subject_class: 'Contact',
//           message: 'Sorry something came up',
//           type: 'notification',
//         },
//       ],
//     })
// }

function sellerAgentCancelAppointment(cb) {
  return frisby
    .create('cancel an appointment by seller agent')
    .post(
      `/showings/${results.showing.create.data.id}/appointments/${results.showing.makeAnotherAppointment.data.id}/cancel`,
      {
        message: 'Sorry something came up I have to cancel this',
      }
    )
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  create,
  getShowing,
  filter,
  filterByStatus,

  getShowingPublic,
  requestAppointment: _makeAppointment('request an appointment'),
  // checkAppointmentNotifications,
  upcomingAppointments,
  buyerAgentGetAppointment,
  buyerAgentCancelAppointment,
  // checkBuyerCancelNotifications,

  makeAnotherAppointment: _makeAppointment('request a new appointment'),
  sellerAgentCancelAppointment,

  createWithValidationError,
}
