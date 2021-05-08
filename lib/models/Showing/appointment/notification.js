const path = require('path')
const promisify = require('../../../utils/promisify')
const Notification = require('../../Notification/issue')
const SMS = require('../../SMS')
const ShowingAppointment = require('./get')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}
const { text: render } = require('../../../utils/render')
const { assert } = require('console')
const SMS_TEMPLATES = path.resolve(__dirname, '/../../templates/sms/showing_appointment')

/**
 * @param {UUID} appointment_id 
 * @param {string[]} associations
 * @returns {Promise<import('./types').ShowingAppointmentPopulated}
 */
async function loadPopulatedAppointment(appointment_id, associations) {
  Orm.setEnabledAssociations(associations)

  const model = await ShowingAppointment.get(appointment_id)
  /** @type {[import('./types').ShowingAppointmentPopulated]} */
  const [appointment] = await Orm.populate({
    models: [model],
    associations,
  })

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

  const notification = {
    title: appointment.showing.title,
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Rescheduled',
    data: { message },
    message: '',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.cancel_notification_type.length > 0)
    .map((r) => r.user_id)
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

      resolve(message.replace(/\n/g, '').replace(/<br>/gi, '\n').trim())
    })
  })
}

/**
 * @param {UUID} appointment_id
 * @param {string} template
 * @param {(appointment: import('./types').ShowingAppointmentPopulated) => unknown} dataFunction
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

  const body = await renderSMS(template, dataFunction(appointment))

  SMS.send({
    body,
    from: sellerAgent.phone_number,
    to: appointment.contact.phone_number,
  })
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentRequestReceipt(appointment_id) {
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
 * @param {import('../approval/types').ShowingApproval} approval
 */
async function sendAppointmentRejectedNotificationToBuyer(appointment_id, approval) {
  assert(approval.approved === false, 'Expected a rejected approval object')

  return sendTextMessageToBuyer(
    appointment_id,
    'showing_role_rejected_showing_appointment.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      time: appointment.time,
      comment: approval.comment
    })
  )
}

/**
 * @param {UUID} appointment_id
 * @param {import('../approval/types').ShowingApproval} approval
 */
async function sendAppointmentConfirmedNotificationToBuyer(appointment_id, approval) {
  assert(approval.approved === false, 'Expected a rejected approval object')

  return sendTextMessageToBuyer(
    appointment_id,
    'showing_role_confirmed_showing_appointment.tmpl',
    (appointment) => ({
      title: appointment.showing.title,
      time: appointment.time
    })
  )
}

module.exports = {
  sendAppointmentRequestNotification,
  sendCancelNotificationToRoles,
  sendRescheduleNotificationToRoles,

  sendAppointmentRequestReceipt,
  sendAppointmentConfirmedNotificationToBuyer,
  sendAppointmentRejectedNotificationToBuyer,
}
