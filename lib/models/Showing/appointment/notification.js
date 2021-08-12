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
const Contact = require('../../Contact/get')
const Showing = require('../showing/get')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}
const { text: render } = require('../../../utils/render')
const db = require('../../../utils/db')
const Crypto = require('../../Crypto')
const SMS_TEMPLATES = path.resolve(__dirname, '../../../templates/sms/showing_appointment')
const ShowingRole = require('../role/get')
const Agent = require('../../Agent/get')

/** @typedef {import('../role/types').ShowingRole} ShowingRole */

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

  if (!appointment.contact.phone_number) {
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
    to: appointment.contact.phone_number,
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
 * @typedef {?} Agent
 * @param {import('../showing/types').Showing} showing
 * @returns {Promise<Agent | null>} 
 */
async function getShowingSellerAgent (showing) {
  const roles = await ShowingRole.getAll(showing.roles)
  if (!roles?.length) { return null }

  const sellerAgentRole = roles.find(r => r.role === 'SellerAgent')
  if (!sellerAgentRole) { return null }
  
  const sellerAgentUser = await User.get(sellerAgentRole.user_id)
  if (!sellerAgentUser) { return null }

  const agent = await Agent.get(sellerAgentUser.agent)
  return agent || null
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
 * @param {UUID} appointmentId
 * @returns {Promise}
 */
async function sendGetFeedbackTextMessageToBuyer (appointmentId) {  
  const appt = await ShowingAppointment.get(appointmentId)
  const contact = await Contact.get(appt.contact)
  
  const phoneNumber = contact?.phone_number
  if (!phoneNumber) { return }

  const showing = await Showing.get(appt.showing)
  const sellerAgent = await getShowingSellerAgent(showing)
  
  const token = Crypto.encryptObject({ id: appt.id, time: appt.time })
  const url = `${config.showings.domain}/showings/appointments/${token}/feedback`

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
    firstname: contact.first_name,
    address: showing.title,
    feedbackUrl,
    agentFullname: sellerAgent.full_name,

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
    action: 'Confirmed',
    message: '',
    app: 'showingapp',
  }

  const userIdsToNotify = appointment.showing.roles
    .filter(r => r.cancel_notification_type.length > 0)
    .filter(r => r.id !== rejecterRoleId)
    .map(r => r.user_id)

  return promisify(Notification.issueForUsers)(notification, userIdsToNotify, {}) 
}

module.exports = {
  sendAppointmentRequestNotification,
  sendCancelNotificationToRoles,
  sendRescheduleNotificationToRoles,
  sendFeedbackReceivedNotificationToRoles,

  sendAppointmentRequestReceiptToBuyer,
  sendAppointmentCancelReceiptToBuyer,
  sendAppointmentConfirmedNotificationToBuyer,
  sendAppointmentRejectedNotificationToBuyer,
  sendGetFeedbackTextMessageToBuyer,

  clearNotifications,

  sendAppointmentCanceledNotificationToOtherRoles,
  sendAppointmentConfirmedNotificationToOtherRoles,
  sendAppointmentRejectedNotificationToOtherRoles,
}
