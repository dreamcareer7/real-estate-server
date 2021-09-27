const db = require('../../../utils/db')
const Approval = require('../approval/get')
const Appointment = require('../appointment/get')
const Showing = require('../showing/get')
const Role = require('../role/get')
const Orm = require('../../Orm/context')
const {
  sendAppointmentConfirmedNotificationToBuyer,
  clearNotifications,
  sendGetFeedbackTextMessageToBuyer,
  sendAppointmentRejectedNotificationToBuyer,
  sendAppointmentCanceledNotificationToOtherRoles,
  sendAppointmentConfirmedNotificationToOtherRoles,
  sendAppointmentRejectedNotificationToOtherRoles,
} = require('./notification')
const mailerFactory = require('./mailer-factory')
const find = require('lodash/find')
const { deepFreeze } = require('../../../utils/belt')
const orderBy = require('lodash/orderBy')

/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */
/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('./types').AppointmentStatus} AppointmentStatus */
/** @typedef {import('../role/types').ShowingRole} ShowingRole */
/** @typedef {import('../showing/types').Showing} Showing */
/** @typedef {import('../../../utils/mailer')} Mailer */
/** @typedef {'ApprovalPerformed' | 'BuyerCanceled' | 'BuyerRescheduled' | 'Finished'} FsmAction */
/** 
 * @typedef {Object} FsmPayload
 * @property {FsmAction} action
 * @property {ShowingAppointment} appointment
 * @property {Showing} showing
 * @property {ShowingApproval[]} approvals
 */
/** @typedef {(payload: FsmPayload) => any} FsmHandler */

/**
 * @param {ShowingApproval[]} approvals
 * @param {ShowingRole['id'][]} roles
 * @returns {boolean}
 */
function everyoneApproved (approvals, roles) {
  return roles
    .map(r => find(approvals, { role: r }))
    .every(a => a?.approved === true)
}

/**
 * @param {ShowingApproval[]} approvals
 * @param {boolean} approved
 * @returns {ShowingApproval | undefined}
 */
function findLatestApproval (approvals, approved) {
  approvals = orderBy(approvals, ['created_at', 'updated_at'], ['desc', 'desc'])

  return find(approvals, { approved })
}

/** @param {Mailer | Promise<Mailer?> | null} mailer */
async function send (mailer) {
  (await mailer)?.send()
}

/**
 * @param {UUID} id
 * @param {AppointmentStatus} status
 */
async function patchStatus(id, status) {
  return db.update('showing/appointment/update_status', [id, status])
}

/**
 * @template T
 * @param {T} actual
 * @returns {(...values: T[]) => boolean}
 */
function predicate (actual) {
  return (...arr) => arr.includes(actual)
}

/** @type {FsmHandler} */
async function finished ({ showing, appointment }) {
  const roles = await Role.getAll(showing.roles)
  
  for (const r of roles) {
    await clearNotifications(r.user_id, appointment.id)
  }  
}

/** @type {FsmHandler} */
async function completed ({ appointment }) {
  await sendGetFeedbackTextMessageToBuyer(appointment.id)
  await send(mailerFactory.forGetFeedbackEmail(appointment))
}

/** @type {FsmHandler} */
async function confirmed ({ appointment, approvals }) {
  const confirmedApproval = findLatestApproval(approvals, true)
  if (!confirmedApproval) { return }

  await send(mailerFactory.forConfirmedAppointment(appointment))
  
  await sendAppointmentConfirmedNotificationToBuyer(appointment.id)
  
  await sendAppointmentConfirmedNotificationToOtherRoles(
    appointment.id,
    confirmedApproval.role
  )
}

/** @type {FsmHandler} */
async function rejected ({ appointment, approvals }) {
  const rejectedApproval = findLatestApproval(approvals, false)
  if (!rejectedApproval) { return }
  
  await send(mailerFactory.forRejectedAppointment(appointment))
  
  await sendAppointmentRejectedNotificationToBuyer(
    appointment.id,
    rejectedApproval
  )

  await sendAppointmentRejectedNotificationToOtherRoles(
    appointment.id,
    rejectedApproval.role
  )
}

/** @type {FsmHandler} */
async function canceledAfterConfirm ({ appointment, approvals }) {
  const canceledApproval = findLatestApproval(approvals, false)
  if (!canceledApproval) { return }

  await send(mailerFactory.forCanceledAppointmentAfterConfirm(appointment))

  // XXX: Why we dont send any SMS here to buyer?!

  await sendAppointmentCanceledNotificationToOtherRoles(
    appointment.id,
    canceledApproval.role
  )
}

/**
 * @param {FsmPayload} payload
 * @returns {AppointmentStatus}
 */
function guessNewStatus ({ action, showing, appointment, approvals }) {
  switch (action) {
    case 'BuyerCanceled':
      return 'Canceled'

    case 'BuyerRescheduled':
      return 'Rescheduled'
      
    case 'Finished':
      return appointment.status === 'Confirmed' ? 'Completed' : 'Canceled'

    case 'ApprovalPerformed':
      // If a role has rejected the appointment, cancel it
      if (find(approvals, { approved: false })) { return 'Canceled' }

      // If no approval is required, we confirm the appointment directly
      if (showing.approval_type === 'None') { return 'Confirmed' }

      /* If no one has made a decision, don't touch anything
       * (Why are we even here?!) */
      if (!approvals.length) { return 'Requested' }

      /* If approval from any role is enough, it should be considered as
       * confirmed */
      if (showing.approval_type === 'Any') { return 'Confirmed' }

      // Otherwise, all roles need to have confirmed the appointment
      if (everyoneApproved(approvals, showing.roles)) { return 'Confirmed' }
      break
      
    default:
  }

  return appointment.status
}

/** @type {FsmHandler} */
async function handleAction (payload) {
  const { action, appointment } = payload

  const oldStatus = appointment.status
  const newStatus = guessNewStatus(payload)
  if (newStatus === oldStatus) { return }
  
  const was = predicate(oldStatus)
  const gonna = predicate(newStatus)

  if (action === 'ApprovalPerformed') {
    if (gonna('Confirmed')) { await confirmed(payload) }

    if (gonna('Canceled')) {
      if (was('Requested', 'Rescheduled')) { await rejected(payload) }
      if (was('Confirmed')) { await canceledAfterConfirm(payload) }
    }
  }

  if (gonna('Completed')) { await completed(payload) }
  if (gonna('Completed', 'Canceled')) { await finished(payload) }

  if (newStatus) { await patchStatus(appointment.id, newStatus) }
}

/**
 * @param {FsmAction} action
 * @param {ShowingAppointment['id']} appointmentId
 */
async function updateStatus(action, appointmentId) {
  Orm.enableAssociation('showing.roles')

  const appointment = await Appointment.get(appointmentId)
  const showing = await Showing.get(appointment.showing)
  const approvals = await Approval.getAll(appointment.approvals ?? [])

  const payload = deepFreeze({ action, appointment, showing, approvals })
  return handleAction(payload)
}

module.exports = { updateStatus }

if (process.env.NODE_ENV === 'tests') {
  module.exports[Symbol.for('test')] = {
    everyoneApproved,
    findLatestApproval,
    send,
    patchStatus,
    predicate,
    finished,
    completed,
    confirmed,
    rejected,
    canceledAfterConfirm,
    guessNewStatus,
    handleAction,
  }
}
