const { strict: assert } = require('assert')
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
const Context = require('../../Context')
const find = require('lodash/find')

/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */
/** @typedef {import('./types').AppointmentStatus} AppointmentStatus */
/** @typedef {import('../showing/types').Showing} Showing */

class ShowingAppointmentStatusTransitionError extends Error {
  /**
   * @param {AppointmentStatus} oldStatus 
   * @param {AppointmentStatus} newStatus 
   */
  constructor(oldStatus, newStatus) {
    super(`Invalid status transition error from '${oldStatus}' to '${newStatus}'`)
  }
}

class ShowingAppointmentStatusError extends Error {
  /** @param {AppointmentStatus} oldStatus */
  constructor(oldStatus) {
    super(`Invalid status transition error from '${oldStatus}'`)
  }
}

/** @type {[AppointmentStatus, AppointmentStatus][]} */
const VALID_TRANSITIONS = [
  ['Requested', 'Confirmed'],
  ['Requested', 'Canceled'],
  ['Requested', 'Rescheduled'],
  ['Confirmed', 'Rescheduled'],
  ['Confirmed', 'Completed'],
  ['Rescheduled', 'Confirmed'],
  ['Rescheduled', 'Canceled'],
  ['Requested', 'Canceled'],
  ['Confirmed', 'Canceled'],
  ['Confirmed', 'Canceled'],
  ['Rescheduled', 'Canceled'],
]

/**
 * @param {UUID} id
 * @param {AppointmentStatus} status
 */
async function patchStatus(id, status) {
  return db.update('showing/appointment/update_status', [id, status])
}

/**
 * @param {object} args
 * @param {ShowingApproval['id'][] | null} args.approvals
 * @returns {() => Promise<ShowingApproval[]>}
 */
function defferedApprovals ({ approvals }) {
  if (!approvals?.length) { return async () => [] }

  let cache = null
  return async () => cache ?? (cache = await Approval.getAll(approvals))
}

/**
 * @param {object} args
 * @param {Showing} args.showing
 * @param {ShowingAppointment} args.appointment
 * @param {ShowingApproval[]} args.approvals
 * @returns {AppointmentStatus}
 */
function guessNewStatus ({ showing, appointment, approvals }) {
  assert(Array.isArray(showing.roles), 'appointment roles must be populated')
  
  // If a role has rejected the appointment, cancel it
  if (approvals.some(a => a.approved === false)) {
    return 'Canceled'
  }

  // If no approval is required, we confirm the appointment directly
  if (showing.approval_type === 'None') {
    return 'Confirmed'
  }

  // If no one has made a decision, don't touch anything (Why are we even here?!)
  if (!approvals.length) {
    return 'Requested'
  }

  // If approval from any role is enough, it should be considered as confirmed
  if (showing.approval_type === 'Any') {
    return 'Confirmed'
  }

  // Otherwise, all roles need to have confirmed the appointment
  if (approvals.every(a => showing.roles.includes(a.role))) {
    return 'Confirmed'
  }

  throw new ShowingAppointmentStatusError(appointment.status)
}

/**
 * @param {UUID} appointment_id
 * @param {AppointmentStatus=} newStatus
 */
async function updateStatus(appointment_id, newStatus) {
  Orm.enableAssociation('showing.roles')

  const appointment = await Appointment.get(appointment_id)
  const showing = await Showing.get(appointment.showing)
  const getApprovals = defferedApprovals(appointment)
  
  const byRole = !newStatus
  newStatus = newStatus ?? guessNewStatus({
    approvals: await getApprovals(),
    appointment,
    showing,
  })

  const oldStatus = appointment.status
  if (oldStatus === newStatus) { return 0 }

  const transition = find(VALID_TRANSITIONS, { 0: oldStatus, 1: newStatus })
  if (!transition) {
    throw new ShowingAppointmentStatusTransitionError(oldStatus, newStatus)
  }

  if (newStatus === 'Confirmed') {
    await sendAppointmentConfirmedNotificationToBuyer(appointment.id)
  }

  if (newStatus === 'Canceled' || newStatus === 'Completed') {
    const roles = await Role.getAll(showing.roles)
    
    for (const r of roles) {
      await clearNotifications(r.user_id, appointment.id)
    }
  }

  if (newStatus === 'Completed') {
    await sendGetFeedbackTextMessageToBuyer(appointment.id)
    await mailerFactory.forGetFeedbackEmail(appointment).then(m => {
      if (m) {
        Context.log('StatusFsm - GetFeedback email sent')
        return m.send()
      }
      Context.log('StatusFsm - nil mailer')
    })
  }

  if (newStatus === 'Canceled') {
    // FIXME: what is this?!
    const approvals = await getApprovals()
    // eslint-disable-next-line no-unused-vars
    const rejectedApproval = approvals.find(a => !a.approved) 
  }

  if (byRole) {
    if (newStatus === 'Confirmed') {
      await mailerFactory.forConfirmedAppointment(appointment).then(m => m?.send())
      await sendAppointmentConfirmedNotificationToBuyer(appointment.id)

      const approvals = await getApprovals()
      const confirmedApproval = approvals.find(a => a.approved)

      if (confirmedApproval) {
        await sendAppointmentConfirmedNotificationToOtherRoles(
          appointment.id,
          confirmedApproval.role
        )
      }
    }

    if (['Requested', 'Rescheduled'].includes(oldStatus) && newStatus === 'Canceled') {
      const approvals = await getApprovals()
      const rejectedApproval = approvals.find(a => !a.approved)

      if (rejectedApproval) {
        await mailerFactory.forRejectedAppointment(appointment).then(m => m?.send())
        
        await sendAppointmentRejectedNotificationToBuyer(
          appointment.id,
          rejectedApproval
        )

        await sendAppointmentRejectedNotificationToOtherRoles(
          appointment.id,
          rejectedApproval.role
        )
      } else {
        /* Impossible state?! */
      }
    }

    if (oldStatus === 'Confirmed' && newStatus === 'Canceled') {
      await mailerFactory.forCanceledAppointmentAfterConfirm(appointment).then(m => m?.send())

      const approvals = await getApprovals()
      const canceledApproval = approvals.find(a => !a.approved)

      if (canceledApproval) {
        await sendAppointmentCanceledNotificationToOtherRoles(
          appointment.id,
          canceledApproval.role
        )
      }
    }
  }
  
  return await patchStatus(appointment_id, newStatus)
}

module.exports = {
  ShowingAppointmentStatusError,
  ShowingAppointmentStatusTransitionError,
  updateStatus,
}
