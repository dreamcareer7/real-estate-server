const { assert } = require('console')
const path = require('path')
const config = require('../../../config')
const promisify = require('../../../utils/promisify')
const Notification = require('../../Notification/issue')
const SMS = require('../../SMS')
const Branch = require('../../Branch')
const Context = require('../../Context')
const User = require('../../User/get')
const ShowingAppointment = require('./get')
const Showing = require('../showing/get')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}
const { text: render } = require('../../../utils/render')
const db = require('../../../utils/db')
const Crypto = require('../../Crypto')
const ShowingRole = require('../role/get')

const SMS_TEMPLATES = path.resolve(__dirname, '../../../templates/sms/showing_appointment')

/** @typedef {import('../role/types').ShowingRole} ShowingRole */
/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */

/**
 * @param {UUID} appointment_id
 * @param {string[]} associations
 * @returns {Promise<import('./types').ShowingAppointmentPopulated>}
 */
async function loadPopulatedAppointment(appointment_id, associations) {
  Orm.setEnabledAssociations(associations)

  const model = await ShowingAppointment.get(appointment_id)
  /** @type {import('./types').ShowingAppointmentPopulated} */
  const appointment = (await Orm.populate({
    models: [model],
    associations,
  }))[0]

  return appointment
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentRequestNotification(appointment_id) {
  const appointment = await loadPopulatedAppointment(appointment_id, [
    'showing_appointment.showing',
    'showing_appointment.contact',
    'showing.roles',
    'showing.deal',
    'showing.listing',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Created',
    message: '',
    app: 'showingapp',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.confirm_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

/**
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function sendCancelNotificationToRoles(appointment_id, message) {
  const appointment = await loadPopulatedAppointment(appointment_id, [
    'showing_appointment.contact',
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Canceled',
    data: { message },
    message: '',
    app: 'showingapp',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.cancel_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

async function sendRescheduleNotificationToRoles(appointment_id, message) {
  const appointment = await loadPopulatedAppointment(appointment_id, [
    'showing_appointment.contact',
    'showing_appointment.showing',
    'showing.roles',
  ])

  const sellerAgent = appointment.showing.roles.find((r) => r.role === 'SellerAgent')
  if (!sellerAgent) {
    throw Error.PreconditionFailed('Invalid appointment with no seller agent')
  }

  const { timezone } = await User.get(sellerAgent.user_id)

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Rescheduled',
    data: { message, timezone },
    message: '',
    app: 'showingapp',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.cancel_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

async function sendFeedbackReceivedNotificationToRoles(appointment_id) {
  const appointment = await loadPopulatedAppointment(appointment_id, [
    'showing_appointment.contact',
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'GaveFeedbackFor',
    data: { },
    message: '',
    app: 'showingapp',
  }

  const usersToNotify = appointment.showing.roles.map(r => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

/**
 * @param {string} template
 * @param {unknown} data
 * @returns {Promise<string>}
 */
async function renderSMS(template, data) {
  return new Promise((resolve, reject) => {
    const tmpl = path.resolve(SMS_TEMPLATES, template)
    render(tmpl, data, (err, message) => {
      if (err) return reject(err)

      resolve(message.trim())
    })
  })
}

/**
 * @param {UUID} appointment_id
 * @param {string} template
 * @param {(appointment: import('./types').ShowingAppointmentPopulated, user: IUser) => object} dataFunction
 */
async function sendTextMessageToBuyer(appointment_id, template, dataFunction) {
  const appointment = await loadPopulatedAppointment(appointment_id, [
    'showing_appointment.showing',
    'showing_appointment.contact',
    'showing.roles',
  ])

  if (!appointment.phone_number) {
    return
  }

  const sellerAgent = appointment.showing.roles.find((r) => r.role === 'SellerAgent')
  if (!sellerAgent) {
    throw Error.PreconditionFailed('Invalid appointment with no seller agent')
  }

  const user = await User.get(sellerAgent.user_id)
  const templateData = {
    ...dataFunction(appointment, user),
    timezone: user.timezone,
  }

  const token = Crypto.encryptObject({ id: appointment.id, time: appointment.time })
  try {
    templateData.cancelLink = await Branch.createURL({
      action: 'CANCEL_SHOWING_APPOINTMENT',
      appointment_id,
      $ios_url: `${config.showings.domain}/showings/appointments/${token}/cancel`,
      $android_url: `${config.showings.domain}/showings/appointments/${token}/cancel`,
      $desktop_url: `${config.showings.domain}/showings/appointments/${token}/cancel`,
      $fallback_url: `${config.showings.domain}/showings/appointments/${token}/cancel`,
      $web_only: true,
    }, {
      branch_key: config.branch.showingapp.key,
    })
    templateData.rescheduleLink = await Branch.createURL({
      action: 'RESCHEDULE_SHOWING_APPOINTMENT',
      appointment_id,
      $ios_url: `${config.showings.domain}/showings/appointments/${token}/reschedule`,
      $android_url: `${config.showings.domain}/showings/appointments/${token}/reschedule`,
      $desktop_url: `${config.showings.domain}/showings/appointments/${token}/reschedule`,
      $fallback_url: `${config.showings.domain}/showings/appointments/${token}/reschedule`,
      $web_only: true,
    }, {
      branch_key: config.branch.showingapp.key,
    })
  } catch (ex) {
    Context.log('Error while generating reschedule or reschedule links')
    Context.error(ex)
  }

  const body = await renderSMS(template, templateData)
  SMS.send({
    body,
    to: appointment.phone_number,
  })
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentRequestReceiptToBuyer(appointment_id) {
  return sendTextMessageToBuyer(
    appointment_id,
    'showing_appointment_created.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      time: appointment.time,
    })
  )
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentCancelReceiptToBuyer(appointment_id) {
  return sendTextMessageToBuyer(
    appointment_id,
    'showing_appointment_canceled.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      time: appointment.time,
    })
  )
}

/**
 * @param {UUID} appointment_id
 * @param {import('../approval/types').ShowingApproval} approval
 */
async function sendAppointmentRejectedNotificationToBuyer(appointment_id, approval) {
  assert(approval.approved === false, 'Expected a rejected approval object')

  return sendTextMessageToBuyer(
    appointment_id,
    'showing_role_rejected_showing_appointment.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      date: appointment.time,
      comment: approval.comment,
    })
  )
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentConfirmedNotificationToBuyer(appointment_id) {
  return sendTextMessageToBuyer(
    appointment_id,
    'showing_role_confirmed_showing_appointment.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      time: appointment.time,
    })
  )
}

/**
 * Acknowledges all unread notifications
 * @param {UUID} user_id 
 * @param {UUID} appointment_id 
 */
async function clearNotifications(user_id, appointment_id) {
  return db.update('showing/appointment/clear_notifications', [
    user_id,
    appointment_id,
  ])
}

/**
 * Fetch and resolves seller agent of a showing.
 * @param {import('../showing/types').Showing} showing
 * @returns {Promise<ShowingRole | null>} 
 */
async function getShowingSellerAgent (showing) {
  const roles = await ShowingRole.getAll(showing.roles)
  return roles?.find?.(r => r.role === 'SellerAgent') ?? null
}

/**
 * @param {UUID} appointmentId
 * @param {UUID} cancelerRoleId
 */
async function sendAppointmentCanceledNotificationToOtherRoles (
  appointmentId,
  cancelerRoleId
) {
  const appointment = await loadPopulatedAppointment(appointmentId, [
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: cancelerRoleId,
    subject_class: 'ShowingRole',
    action: 'Canceled',
    message: '',
    app: 'showingapp',
  }

  const userIdsToNotify = appointment.showing.roles
    .filter(r => r.cancel_notification_type.length > 0)
    .filter(r => r.id !== cancelerRoleId)
    .map(r => r.user_id)

  return promisify(Notification.issueForUsers)(notification, userIdsToNotify, {}) 
}

/**
 * @param {ShowingAppointment['id']} apptId
 * @param {ShowingApproval=} [approval]
 */
async function sendAppointmentCanceledAfterConfirmToBuyer (
  apptId,
  approval,
) {
  assert(!approval?.approved, 'Expected a canceled approval object')
  
  return sendTextMessageToBuyer(
    apptId,
    'showing_appointment_canceled_after_confirm.tmpl',
    appt => ({
      title: appt.showing.title,
      date: appt.time,
      ...(approval?.comment ? { comment: approval.comment } : null),
    })
  )
}

async function sendFeedbackReceivedTextMessageToBuyer (appointmentId) {
  const appt = await ShowingAppointment.get(appointmentId)
  
  const phoneNumber = appt.phone_number
  if (!phoneNumber) { return }

  const showing = await Showing.get(appt.showing)
  const sellerAgent = await getShowingSellerAgent(showing)

  const agentFullname = [
    sellerAgent?.first_name || '',
    sellerAgent?.last_name || '',
  ].join(' ').trim()
  
  const body = await renderSMS('buyer_feedback_received.tmpl', {
    firstname: appt.first_name,
    address: showing.title,
    agentFullname,

    /* TODO: extract true brokerage name. For now, do not pass brokerage
     * to the template */
    // brokerage: 'Fake Brokerage',
  })

  SMS.send({ body, to: phoneNumber })  
}

/**
 * @param {UUID} appointmentId
 * @returns {Promise}
 */
async function sendGetFeedbackTextMessageToBuyer (appointmentId) {  
  const appt = await ShowingAppointment.get(appointmentId)
  
  const phoneNumber = appt.phone_number
  if (!phoneNumber) { return }

  const showing = await Showing.get(appt.showing)
  const sellerAgent = await getShowingSellerAgent(showing)
  
  const token = Crypto.encryptObject({ id: appt.id, time: appt.time })
  const url = `${config.showings.domain}/showings/appointments/${token}/feedback`

  const agentFullname = [
    sellerAgent?.first_name || '',
    sellerAgent?.last_name || '',
  ].join(' ').trim()
  
  const feedbackUrl = await Branch.createURL({
    action: 'FEEDBACK_SHOWING_APPOINTMENT',
    appointment_id: appt.id,
    $ios_url: url,
    $android_url: url,
    $desktop_url: url,
    $fallback_url: url,
    $web_only: true,
  }).catch(err => {
    Context.log('Error while generating feedback link')
    Context.error(err)
  })
  
  const body = await renderSMS('get_buyer_feedback.tmpl', {
    firstname: appt.first_name,
    address: showing.title,
    feedbackUrl,
    agentFullname,

    /* TODO: extract true brokerage name. For now, do not pass brokerage
     * to the template */
    // brokerage: 'Fake Brokerage',
  })

  SMS.send({ body, to: phoneNumber })
}

/**
 * @param {UUID} appointmentId
 * @param {UUID} confirmerRoleId
 */
async function sendAppointmentConfirmedNotificationToOtherRoles (
  appointmentId,
  confirmerRoleId
) {
  const appointment = await loadPopulatedAppointment(appointmentId, [
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: confirmerRoleId,
    subject_class: 'ShowingRole',
    action: 'Confirmed',
    message: '',
    app: 'showingapp',
  }

  const userIdsToNotify = appointment.showing.roles
    .filter(r => r.cancel_notification_type.length > 0)
    .filter(r => r.id !== confirmerRoleId)
    .map(r => r.user_id)

  return promisify(Notification.issueForUsers)(notification, userIdsToNotify, {}) 
}

/**
 * @param {UUID} appointmentId
 * @param {UUID} rejecterRoleId
 */
async function sendAppointmentRejectedNotificationToOtherRoles (
  appointmentId,
  rejecterRoleId
) {
  const appointment = await loadPopulatedAppointment(appointmentId, [
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: rejecterRoleId,
    subject_class: 'ShowingRole',
    action: 'Rejected',
    message: '',
    app: 'showingapp',
  }

  const userIdsToNotify = appointment.showing.roles
    .filter(r => r.cancel_notification_type.length > 0)
    .filter(r => r.id !== rejecterRoleId)
    .map(r => r.user_id)

  return promisify(Notification.issueForUsers)(notification, userIdsToNotify, {}) 
}

/** @param {ShowingAppointment['id']} apptId */
async function sendAppointmentAutoConfirmedToRoles (apptId) {
  const appt = await loadPopulatedAppointment(apptId, [
    'showing_appointment.contact',
    'showing_appointment.showing',
    'showing.roles',
  ])

  const notification = {
    title: appt.showing.title,
    object: appt.id,
    object_class: 'ShowingAppointment',

    /* FIXME: These fields are meaningless. True subject of this notification is
     * our server probably: */
    subject: appt.contact.id,
    subject_class: 'Contact',

    action: 'Confirmed',
    data: { auto: true },
    message: '',
    app: 'showingapp',
  }
  
  const userIdsToNotify = appt.showing.roles
    .filter(r => r.confirm_notification_type.length > 0)
    .map(r => r.user_id)

  return promisify(Notification.issueForUsers)(notification, userIdsToNotify, {})
}

/** @param {ShowingAppointment['id']} apptId */
async function sendAppointmentAutoConfirmedToBuyer (apptId) {
  return sendTextMessageToBuyer(
    apptId,
    'showing_appointment_automatically_confirmed.tmpl',
    appt => ({
      title: appt.showing.title,
      time: appt.time,
    })
  )
}

module.exports = {
  sendAppointmentRequestNotification,
  sendCancelNotificationToRoles,
  sendRescheduleNotificationToRoles,
  sendFeedbackReceivedNotificationToRoles,
  sendAppointmentAutoConfirmedToRoles,

  sendAppointmentRequestReceiptToBuyer,
  sendAppointmentCancelReceiptToBuyer,
  sendAppointmentConfirmedNotificationToBuyer,
  sendAppointmentRejectedNotificationToBuyer,
  sendGetFeedbackTextMessageToBuyer,
  sendFeedbackReceivedTextMessageToBuyer,
  sendAppointmentCanceledAfterConfirmToBuyer,
  sendAppointmentAutoConfirmedToBuyer,
  
  clearNotifications,

  sendAppointmentCanceledNotificationToOtherRoles,
  sendAppointmentConfirmedNotificationToOtherRoles,
  sendAppointmentRejectedNotificationToOtherRoles,
}
