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
const some = require('lodash/some')
const { deepFreeze } = require('../../../utils/belt')

/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */
/** @typedef {import('./types').AppointmentStatus} AppointmentStatus */
/** @typedef {import('../showing/types').Showing} Showing */
/** @typedef {('ShowingRole' | 'Buyer' | 'System')} FsmActor */
/** @typedef {import('../../../utils/mailer')} Mailer */

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

/** @type {[AppointmentStatus, AppointmentStatus, FsmActor][]} */
const VALID_TRANSITIONS = [
  /* Buyer is able to reschedule a non-finished appt.
   * See: ./reschedule.js */
  ['Requested', 'Rescheduled', 'Buyer'],
  ['Confirmed', 'Rescheduled', 'Buyer'],

  /* Role is able to confirm a requested/rescheduled appt.
   * See: FsmHandler#confirmed */
  ['Requested', 'Confirmed', 'ShowingRole'],
  ['Rescheduled', 'Confirmed', 'ShowingRole'],

  /* Role is able to reject a requested/rescheduled appt.
   * See: FsmHandler#finished, FsmHandler#rejected */
  ['Requested', 'Canceled', 'ShowingRole'],
  ['Rescheduled', 'Canceled', 'ShowingRole'],

  /* Role is able to cancel a confirmed appt.
   * See: FsmHandler#finished, FsmHandler#canceledAfterConfirmByRole */
  ['Confirmed', 'Canceled', 'ShowingRole'],

  /* Buyer is able to cancel a non-completed appt.
   * See: FsmHandler#finished, ./cancel.js */
  ['Requested', 'Canceled', 'Buyer'],
  ['Rescheduled', 'Canceled', 'Buyer'],
  ['Confirmed', 'Canceled', 'Buyer'],

  /* System is able to finalize a non-finished appt.
   * Eventually, *all* appointments will be canceled or completed.
   * See: FsmHandler#finished, FsmHandler#completed */
  ['Requested', 'Canceled', 'System'],
  ['Rescheduled', 'Canceled', 'System'],
  ['Confirmed', 'Completed', 'System'],
]

/**
 * @param {object} args
 * @param {Showing} args.showing
 * @param {ShowingAppointment} args.appointment
 * @param {ShowingApproval[]} args.approvals
 * @returns {AppointmentStatus}
 */
function guessNewStatus ({ showing, appointment, approvals }) {
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
 * @param {AppointmentStatus} oldStatus
 * @param {AppointmentStatus} newStatus
 */
function validateTransition (oldStatus, newStatus) {
  if (!some(VALID_TRANSITIONS, { 0: oldStatus, 1: newStatus })) {
    throw new ShowingAppointmentStatusTransitionError(oldStatus, newStatus)
  }
}

/**
 * @typedef {(..._: AppointmentStatus[]) => boolean} UniMatcher
 *
 * @param {AppointmentStatus} oldStatus
 * @param {AppointmentStatus} newStatus
 * @returns {{ was: UniMatcher, is: UniMatcher }}
 */
function transitionMatcher (oldStatus, newStatus) {
  return {
    /** @type {UniMatcher} */
    is: (...news) => news.includes(newStatus),
    /** @type {UniMatcher} */
    was: (...olds) => olds.includes(oldStatus),
  }
}

class FsmHandler {
  /**
   * @param {object} args
   * @param {Showing} args.showing
   * @param {ShowingAppointment} args.appointment
   * @param {ShowingApproval[]} args.approvals
   */
  constructor ({ showing, appointment, approvals }) {
    /** @protected @readonly @type {Showing} */
    this.showing = deepFreeze(showing)
    
    /** @protected @readonly @type {ShowingAppointment} */
    this.appointment = deepFreeze(appointment)

    /** @protected @readonly @type {ShowingApproval[]} */
    this.approvals = deepFreeze(approvals)
  }

  /**
   * @param {object} args
   * @param {FsmActor} args.actor
   * @param {AppointmentStatus} args.oldStatus
   * @param {AppointmentStatus} args.newStatus
   */
  async handle ({ actor, oldStatus, newStatus }) {
    const { was, is } = transitionMatcher(oldStatus, newStatus)
    const byRole = actor === 'ShowingRole'
    
    if (is('Canceled', 'Completed')) {
      await this.finished()
    }

    if (is('Completed')) {
      await this.completed()
    }
    
    if (byRole && is('Confirmed')) {
      await this.confirmed()
    }

    if (byRole && was('Requested', 'Rescheduled') && is('Canceled')) {
      await this.rejected()
    }

    if (byRole && was('Confirmed') && is('Canceled')) {
      await this.canceledAfterConfirmByRole()
    }
  }

  async finished () {
    const roles = await Role.getAll(this.showing.roles)
    
    for (const r of roles) {
      await clearNotifications(r.user_id, this.appointment.id)
    }
  }

  async completed () {
    await sendGetFeedbackTextMessageToBuyer(this.appointment.id)
    await send(mailerFactory.forGetFeedbackEmail(this.appointment))
  }

  async confirmed () {
    await send(mailerFactory.forConfirmedAppointment(this.appointment))
    await sendAppointmentConfirmedNotificationToBuyer(this.appointment.id)

    const confirmedApproval = this.approvals.find(a => a.approved)

    if (confirmedApproval) {
      await sendAppointmentConfirmedNotificationToOtherRoles(
        this.appointment.id,
        confirmedApproval.role
      )
    }
  }

  async rejected () {
    const rejectedApproval = this.approvals.find(a => !a.approved)
    if (!rejectedApproval) { return }
    
    await send(mailerFactory.forRejectedAppointment(this.appointment))
    
    await sendAppointmentRejectedNotificationToBuyer(
      this.appointment.id,
      rejectedApproval
    )

    await sendAppointmentRejectedNotificationToOtherRoles(
      this.appointment.id,
      rejectedApproval.role
    )
  }

  async canceledAfterConfirmByRole () {
    await send(mailerFactory.forCanceledAppointmentAfterConfirm(this.appointment))

    const canceledApproval = this.approvals.find(a => !a.approved)

    if (canceledApproval) {
      await sendAppointmentCanceledNotificationToOtherRoles(
        this.appointment.id,
        canceledApproval.role
      )
    }
  }
}

/**
 * @param {UUID} appointment_id
 * @param {FsmActor} actor
 * @param {AppointmentStatus=} newStatus
 * @returns {Promise<number>}
 */
async function updateStatus(appointment_id, actor, newStatus) {
  Orm.enableAssociation('showing.roles')

  const appointment = await Appointment.get(appointment_id)
  const showing = await Showing.get(appointment.showing)
  const approvals = await Approval.getAll(appointment.approvals ?? [])
  const oldStatus = appointment.status
  
  newStatus = newStatus ?? guessNewStatus({ showing, appointment, approvals })
  if (oldStatus === newStatus) { return 0 }
  
  validateTransition(oldStatus, newStatus)

  const handler = new FsmHandler({ showing, appointment, approvals })
  await handler.handle({ actor, oldStatus, newStatus })

  return patchStatus(appointment.id, newStatus)
}

module.exports = {
  ShowingAppointmentStatusError,
  ShowingAppointmentStatusTransitionError,
  updateStatus,
}
