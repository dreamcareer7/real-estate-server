const merge = require('lodash/merge')
const moment = require('moment')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

const Context = require('../../../lib/models/Context')
const Showing = require('../../../lib/models/Showing/showing/create')
const ContactLead = require('../../../lib/models/Contact/lead/save')
const Email = require('../../../lib/models/Email/create')
const Notification = require('../../../lib/models/Notification/create')

const sql = require('../../../lib/utils/sql')
const brandHelper = require('../brand/helper')
const userHelper = require('../user/helper')

const FakeSMS = {
  send: sinon.fake((_, cb) => cb?.()),
}

const SpiedEmail = {
  create: sinon.fake(Email.create),
}

const SpiedNotification = {
  create: sinon.fake(Notification.create),
}

const SpiedAppointmentNotification = proxyquire('../../../lib/models/Showing/appointment/notification', {
  '../../SMS': FakeSMS,

  '../../Notification/issue': proxyquire('../../../lib/models/Notification/issue', {
    './create': SpiedNotification,
  })
})
SpiedAppointmentNotification.clearNotifications = sinon.fake(SpiedAppointmentNotification.clearNotifications)

const mailerFactoryDeps = proxyquire('../../../lib/models/Showing/appointment/mailer-factory', {
  './mailer': proxyquire('../../../lib/models/Showing/appointment/mailer', {
    '../../../utils/mailer': proxyquire('../../../lib/utils/mailer', {
      '../models/Email/create': SpiedEmail,
    }),
  }),
})

const fsmDeps = proxyquire('../../../lib/models/Showing/appointment/status_fsm', {
  './notification': SpiedAppointmentNotification,
  './mailer-factory': mailerFactoryDeps,
})

const Appointment = {
  ...require('../../../lib/models/Showing/appointment/get'),
  ...proxyquire('../../../lib/models/Showing/appointment/create', {
    './status_fsm': fsmDeps,
  }),
  ...proxyquire('../../../lib/models/Showing/appointment/cancel', {
    './status_fsm': fsmDeps,
  }),
  ...proxyquire('../../../lib/models/Showing/appointment/reschedule', {
    './status_fsm': fsmDeps,
  }),
  ...proxyquire('../../../lib/models/Showing/appointment/poller', {
    './status_fsm': fsmDeps,
    './mailer-factory': mailerFactoryDeps,
  }),
  ...proxyquire('../../../lib/models/Showing/appointment/feedback', {
    './status_fsm': fsmDeps,
  }),
}
const Approval = proxyquire('../../../lib/models/Showing/approval/patch', {
  '../appointment/status_fsm': fsmDeps,
})

const { handleJobs } = require('../helper')

/** @typedef {import('../../../lib/models/Showing/showing/types').ShowingInput} ShowingInput */
/** @typedef {import('../../../lib/models/Showing/role/types').ShowingRoleInput} ShowingRoleInput */
/** @typedef {import('../../../lib/models/Showing/availability/types').ShowingAvailabilityInput} ShowingAvailabilityInput */
/** @typedef {import('../../../lib/models/Showing/appointment/types').ShowingAppointmentRequestPayload} ShowingAppointmentRequestPayload */
/** @typedef {import('../../../lib/models/Showing/appointment/types').AppointmentFeedback} AppointmentFeedback */

const defaults = Object.freeze({
  /** @type {Partial<ShowingInput>} */
  showingInput: {
    start_date: moment().toISOString(),
    aired_at: moment().toISOString(),
    duration: 60 * 15, // seconds
    notice_period: 0, // seconds
    approval_type: 'None',
    same_day_allowed: true,
    allow_appraisal: true,
    allow_inspection: true,
    instructions: 'fake-instructions',
    availabilities: [
      availabilityInput('Monday'),
      availabilityInput('Tuesday'),
      availabilityInput('Wednesday'),
      availabilityInput('Thursday'),
      availabilityInput('Friday'),
      availabilityInput('Saturday'),
      availabilityInput('Sunday'),
    ],    
  },

  /** @type {Partial<ShowingRoleInput>} */
  roleInput: {
    role: 'SellerAgent',
    can_approve: true,
    confirm_notification_type: ['email', 'sms', 'push'],
    cancel_notification_type: ['email', 'sms', 'push'],
  },

  /** @type {Omit<ShowingAppointmentRequestPayload, 'contact'> & { contact: any }} */
  request: {
    source: 'test',
    contact: {
      phone_number: '+9876543210',
      first_name: 'Buyers-First',
      last_name: 'Buyers-Last',
      email: 'fake+buyer@rechat.com',
      company: 'Rechat',
    }
  },

  buyerCancelMessage: 'fake-buyer-cancel-message',

  roleApprovalComment: 'fake-approval-comment',

  buyerRescheduleMessage: 'fake-buyer-reschedule-message',

  /** @type {AppointmentFeedback} */
  feedback: {
    questions: ['fake-question1', 'fake-question2'],
    answers: ['fake-answer1', 'fake-answer2'],
    comment: 'fake-feedback-comment',
  },
})

async function setup () {
  const user = await userHelper.TestUser()
  const user2 = await userHelper.fetchUser('test+email@rechat.com')

  const brand = await brandHelper.create({
    roles: {
      SellerAgent: {
        acl: ['Admin', 'Showings'],
        members: [user.id],
      },
      AdminOnly: {
        acl: ['Admin'],
        members: [user2.id],
      },
    }
  })

  const listingId = await sql.selectId(
    'SELECT id FROM listings ORDER BY created_at ASC LIMIT 1',
  )

  const { contact } = await ContactLead.saveContact(
    'JSON',
    defaults.request.contact,
    'Showing',
    user.id,
    brand.id,
  )

  if (!listingId) {
    throw new Error('Could not fetch a random listing')
  }

  Context.set({
    user: user.id,
    user2: user2.id,
    brand: brand.id,
    listing: listingId,
    userObject: user,
    user2Object: user2,
    contact,
  })

  await handleJobs()
}

function cleanup () {
  resetFakeHistory()
  
  Context.unset('user')
  Context.unset('user2')
  Context.unset('brand')
  Context.unset('listing')
  Context.unset('userObject')
  Context.unset('user2Object')
  Context.unset('contact')
}

/**
 * @param {ShowingAvailabilityInput['weekday']} weekday
 * @param {ShowingAvailabilityInput['availability']} availability
 * @returns {ShowingAvailabilityInput}
 */
function availabilityInput (
  weekday,
  availability = [0, 24 * 3600 - 1],
) {
  return { weekday, availability }
}

/**
 * @param {IUser} [user]
 * @param {Partial<ShowingRoleInput>} [input]
 * @returns {ShowingRoleInput}
 */
function roleInput (
  user = Context.get('userObject'),
  input = {},
) {
  const mergedInput = merge({
    user: user.id,
    brand: Context.get('brand'),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone_number: user.phone_number,
  }, defaults.roleInput, input)

  if (input.confirm_notification_type) {
    mergedInput.confirm_notification_type = input.confirm_notification_type
  }
  
  if (input.cancel_notification_type) {
    mergedInput.cancel_notification_type = input.cancel_notification_type
  }

  return /** @type {any} */(mergedInput)
}

/**
 * @param {Partial<ShowingInput>=} [input]
 * @param {IUser['id']} [user]
 * @param {IBrand['id']} [brand]
 */
async function create (
  input = {},
  user = Context.get('user'),
  brand = Context.get('brand'),
) {
  const finalInput = merge(
    {
      roles: [
        roleInput(),
        roleInput(Context.get('user2Object'), { role: 'Other' }),
      ],

      listing: Context.get('listing'),
    },
    defaults.showingInput,
    input,
  )

  if (input.roles) {
    finalInput.roles = input.roles
  }

  return Showing.create(/** @type {any} */(finalInput), user, brand)
}

/**
 * @param {UUID} showingId
 * @param {Partial<ShowingAppointmentRequestPayload>} [payload]
 * @returns {Promise<UUID>}
 */
async function request (showingId, payload) {
  return Appointment.request(showingId, merge({
    time: moment().add(1, 'hour').toISOString(),
  }, defaults.request, payload))
}

/**
 * @param {UUID} apptId
 * @param {string} [message]
 */
async function cancel (apptId, message = defaults.buyerCancelMessage) {
  return Appointment.cancel(apptId, message)
}

/**
 * @param {IUser['id']} userId
 * @param {UUID} apptId
 * @param {boolean} [confirmed]
 * @param {string} [comment]
 */
async function approval (
  userId,
  apptId,
  confirmed = true,
  comment = defaults.roleApprovalComment,
) {
  return Approval.patch(userId, apptId, { approved: confirmed, comment })
}

/**
 * @param {UUID} apptId
 * @param {string} [newTime]
 * @param {string} [message]
 */
async function reschedule (
  apptId,
  newTime = moment().add(2, 'hour').toISOString(),
  message = defaults.buyerRescheduleMessage
) {
  return Appointment.reschedule(apptId, newTime, message)
}

function resetFakeHistory () {
  FakeSMS.send.resetHistory()
  SpiedEmail.create.resetHistory()
  SpiedNotification.create.resetHistory()
  SpiedAppointmentNotification.clearNotifications.resetHistory()
}

/**
 * @param {UUID} apptId
 * @param {string} [newTime]
 */
async function updateAppointmentTime (
  apptId,
  newTime = moment().add(-1, 'hour').toISOString(),
) {
  return sql.update(
    'UPDATE showings_appointments SET time = $2::timestamptz WHERE id = $1::uuid',
    [apptId, newTime]
  )
}

/**
 * @param {UUID} apptId
 * @param {AppointmentFeedback} [feedback]
 */
async function feedback (apptId, feedback = defaults.feedback) {
  return Appointment.setFeedback(apptId, feedback)
}

module.exports = {
  defaults,
  setup,
  cleanup,
  create,
  request,
  cancel,
  FakeSMS,
  SpiedEmail,
  SpiedNotification,
  roleInput,
  approval,
  resetFakeHistory,
  reschedule,
  updateAppointmentTime,
  Appointment,
  SpiedAppointmentNotification,
  feedback,
}
