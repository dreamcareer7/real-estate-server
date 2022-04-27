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
  sendAppointmentCanceledAfterConfirmToBuyer,
  sendAppointmentAutoConfirmedToRoles,
  sendAppointmentAutoConfirmedToBuyer,
  sendAppointmentRequestNotification,
  sendAppointmentRequestReceiptToBuyer,
  sendCancelNotificationToRoles,
  sendAppointmentCancelReceiptToBuyer,
  sendFeedbackReceivedNotificationToRoles,
  sendRescheduleNotificationToRoles,
  sendFeedbackReceivedTextMessageToBuyer,
} = require('./notification')
const mailerFactory = require('./mailer-factory')
const find = require('lodash/find')
const { deepFreeze } = require('../../../utils/belt')
const orderBy = require('lodash/orderBy')
const { strict: assert } = require('assert')
const emitter = require('./emitter')
const Context = require('../../Context')

/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */
/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('./types').AppointmentStatus} AppointmentStatus */
/** @typedef {import('../role/types').ShowingRole} ShowingRole */
/** @typedef {import('../showing/types').Showing} Showing */
/** @typedef {import('../../../utils/mailer')} Mailer */
/** @typedef {'ApprovalPerformed' | 'BuyerCanceled' | 'Rescheduled' | 'Finished' | 'Requested' | 'GaveFeedback'} FsmAction */
/** 
 * @typedef {Object} FsmPayload
 * @property {FsmAction} action
 * @property {ShowingAppointment} appointment
 * @property {Showing} showing
 * @property {ShowingApproval[]} approvals
 */
/** @typedef {(payload: FsmPayload) => any} FsmHandler */

const utils = (function () {
  /** @type {[AppointmentStatus, AppointmentStatus][]} */
  const VALID_TRANSITIONS = [
    ['Requested', 'Requested'],
    ['Requested', 'Confirmed'],
    ['Requested', 'Canceled'],
    ['Requested', 'Rescheduled'],
    ['Requested', 'Canceled'],
    
    ['Confirmed', 'Rescheduled'],
    ['Confirmed', 'Completed'],
    ['Confirmed', 'Confirmed'],
    ['Confirmed', 'Requested'],
    ['Confirmed', 'Canceled'],

    ['Rescheduled', 'Rescheduled'],
    ['Rescheduled', 'Confirmed'],
    ['Rescheduled', 'Canceled'],
    ['Rescheduled', 'Canceled'],

    ['Completed', 'Completed'],
    ['Canceled', 'Canceled'],
  ]

  /**
   * @param {ShowingAppointment} appt
   * @param {string=} [type]
   */
  function approvalNotFound (appt, type) {
    utils.appointmentLog(appt, `${type ?? '?'} approval not found`)
  }

  /**
   * @param {ShowingAppointment} appt
   * @param {string} msg
   */
  function appointmentLog (appt, msg) {
    Context.log(`[Showings] Appointment ${appt?.id ?? '?'} - ${msg ?? '?'}`)
  }
  
  /**
   * @param {AppointmentStatus} from
   * @param {AppointmentStatus} to
   */
  function validateTransition (from, to) {
    if (!VALID_TRANSITIONS.some(([f, t]) => f === from && t === to)) {
      throw new Error(`Invalid Transition: ${from} -> ${to}`)
    }
  }

  /**
   * @param {ShowingApproval[]} approvals
   * @param {ShowingRole['id'][]} roles
   * @returns {boolean}
   */
  function everyoneApproved (approvals, roles) {
    if (!roles.length || !approvals.length) { return false }

    const relatedApprovals = roles.map(r => find(approvals, { role: r }))
    if (!relatedApprovals?.length) { return false }
    
    return relatedApprovals.every(a => a?.approved === true)
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
   * @param {FsmPayload} payload
   * @returns {AppointmentStatus}
   */
  function guessNewStatus ({ action, showing, appointment, approvals }) {
    // There is no hope for Canceled and Completed appointments!
    if (['Canceled', 'Completed'].includes(appointment.status)) {
      return appointment.status
    }
    
    switch (action) {
      case 'BuyerCanceled':
        return 'Canceled'

      case 'Rescheduled':
        return showing.approval_type === 'None' ? 'Confirmed' : 'Rescheduled'
        
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
        if (utils.everyoneApproved(approvals, showing.roles)) {
          return 'Confirmed'
        }
        break

      case 'Requested':
        assert.equal(
          appointment.status,
          'Requested',
          'BuyerRequested action needs a requested appointment'
        )
        return showing.approval_type === 'None' ? 'Confirmed' : 'Requested'
        
      default:
    }

    return appointment.status
  }

  return {
    approvalNotFound,
    appointmentLog,
    validateTransition,
    everyoneApproved,
    findLatestApproval,
    send,
    patchStatus,
    guessNewStatus,
  }
})()

const handlers = (function () {
  /** @type {FsmHandler} */
  async function finalized ({ showing, appointment }) {
    utils.appointmentLog(appointment, 'Finalized')
    
    const roles = await Role.getAll(showing.roles)
    
    for (const r of roles) {
      await clearNotifications(r.user_id, appointment.id)
    }  
  }

  /** @type {FsmHandler} */
  async function completed ({ appointment }) {
    utils.appointmentLog(appointment, 'Completed')
    
    await sendGetFeedbackTextMessageToBuyer(appointment.id)
    await utils.send(mailerFactory.forGetFeedbackEmail(appointment))

    emitter.emit('appointmentConfirmed', appointment.id)
  }

  /** @type {FsmHandler} */
  async function confirmed ({ appointment, approvals }) {
    utils.appointmentLog(appointment, 'Confirmed')
    
    const confirmedApproval = utils.findLatestApproval(approvals, true)
    if (!confirmedApproval) {
      return utils.approvalNotFound(appointment, 'confirmed')
    }

    await utils.send(mailerFactory.forConfirmedAppointment(appointment))
    
    await sendAppointmentConfirmedNotificationToBuyer(appointment.id)
    
    await sendAppointmentConfirmedNotificationToOtherRoles(
      appointment.id,
      confirmedApproval.role
    )

    emitter.emit('appointmentConfirmed', appointment.id)
  }

  /** @type {FsmHandler} */
  async function rejected ({ appointment, approvals }) {
    utils.appointmentLog(appointment, 'Rejected')
    
    const rejectedApproval = utils.findLatestApproval(approvals, false)
    if (!rejectedApproval) {
      return utils.approvalNotFound(appointment, 'rejected (AKA canceled)')
    }
    
    await utils.send(mailerFactory.forRejectedAppointment(appointment))
    
    await sendAppointmentRejectedNotificationToBuyer(
      appointment.id,
      rejectedApproval
    )

    await sendAppointmentRejectedNotificationToOtherRoles(
      appointment.id,
      rejectedApproval.role
    )

    emitter.emit('appointmentDenied', appointment.id)
  }

  /** @type {FsmHandler} */
  async function canceledAfterConfirm ({ appointment, approvals }) {
    utils.appointmentLog(appointment, 'Canceled after Confirm')
    
    const canceledApproval = utils.findLatestApproval(approvals, false)
    if (!canceledApproval) {
      return utils.approvalNotFound(appointment, 'canceled (after confirm)')
    }

    await utils.send(mailerFactory.forCanceledAppointmentAfterConfirm(appointment))

    await sendAppointmentCanceledAfterConfirmToBuyer(
      appointment.id,
      canceledApproval,
    )

    await sendAppointmentCanceledNotificationToOtherRoles(
      appointment.id,
      canceledApproval.role,
    )

    emitter.emit('appointmentCancelled', appointment.id)
  }

  /** @type {FsmHandler} */
  async function autoConfirmed ({ appointment }) {
    utils.appointmentLog(appointment, 'Auto Confirmed')
    
    await sendAppointmentAutoConfirmedToRoles(appointment.id)
    await sendAppointmentAutoConfirmedToBuyer(appointment.id)

    await utils.send(mailerFactory.forAutoConfirmedAppointment(appointment))
  }

  /** @type {FsmHandler} */
  async function requested ({ appointment }) {
    utils.appointmentLog(appointment, 'Requested')
    
    await sendAppointmentRequestNotification(appointment.id)
    await sendAppointmentRequestReceiptToBuyer(appointment.id)

    await utils.send(mailerFactory.forRequestedAppointment(appointment))
  }

  /** @type {FsmHandler} */
  async function buyerCanceled ({ appointment: appt }) {
    utils.appointmentLog(appt, 'Canceled by Buyer')
    
    await sendCancelNotificationToRoles(appt.id, appt.buyer_message ?? '')
    await sendAppointmentCancelReceiptToBuyer(appt.id)

    // XXX: do we need to send an email to buyer as well?
  }

  /** @type {FsmHandler} */
  async function gaveFeedback ({ appointment: appt }) {
    utils.appointmentLog(appt, 'Buyer Feedback Received')
    
    await sendFeedbackReceivedNotificationToRoles(appt.id)
    await sendFeedbackReceivedTextMessageToBuyer(appt.id)
    
    await utils.send(mailerFactory.forReceivedFeedback(appt))
  }

  /** @type {FsmHandler} */
  async function rescheduled ({ appointment: appt }) {
    utils.appointmentLog(appt, 'Rescheduled')
    
    await sendRescheduleNotificationToRoles(appt.id, appt.buyer_message ?? '')
    // XXX: do we need to send a sms to buyer as well?
    
    await utils.send(mailerFactory.forRescheduledAppointment(appt))
  }

  /** @type {FsmHandler} */
  async function handleAction (payload) {
    const { action, appointment } = payload

    const oldStatus = appointment.status
    const newStatus = utils.guessNewStatus(payload)
    const changed = oldStatus !== newStatus
    
    utils.validateTransition(oldStatus, newStatus)
    utils.appointmentLog(appointment, `${action}: ${oldStatus}->${newStatus}`)
    
    if (changed) {
      await utils.patchStatus(appointment.id, newStatus)
    }
    
    const was = (...stts) => changed && stts.includes(oldStatus)
    const gonna = (...stts) => changed && stts.includes(newStatus)
    const remains = (...stts) => !changed && stts.includes(newStatus)

    if (gonna('Completed', 'Canceled')) { await handlers.finalized(payload) }
    if (gonna('Completed')) { await handlers.completed(payload) }

    switch (action) {
      case 'Rescheduled':
        if (gonna('Confirmed') || remains('Confirmed')) {
          await handlers.autoConfirmed(payload)
        }
        if (gonna('Rescheduled')) { await handlers.rescheduled(payload) }
        break
        
      case 'GaveFeedback':
        await handlers.gaveFeedback(payload)
        break

      case 'Requested':
        if (gonna('Confirmed')) { await handlers.autoConfirmed(payload) }
        if (remains('Requested')) { await handlers.requested(payload)}
        break

      case 'ApprovalPerformed':
        if (gonna('Confirmed')) { await handlers.confirmed(payload) }

        if (gonna('Canceled')) {
          if (was('Requested', 'Rescheduled')) { await handlers.rejected(payload) }
          if (was('Confirmed')) { await handlers.canceledAfterConfirm(payload) }
        }
        break

      case 'BuyerCanceled':
        await handlers.buyerCanceled(payload)
        break

      default:
        // do nothing
    }
  }

  return {
    finalized,
    completed,
    confirmed,
    rejected,
    canceledAfterConfirm,
    handleAction,
    autoConfirmed,
    requested,
    buyerCanceled,
    gaveFeedback,
    rescheduled,
  }  
})()

/**
 * @param {FsmAction} action
 * @param {ShowingAppointment['id']} appointmentId
 */
async function dispatchEvent (action, appointmentId) {
  Orm.enableAssociation('showing.roles')

  const appointment = await Appointment.get(appointmentId)
  const showing = await Showing.get(appointment.showing)
  const approvals = await Approval.getAll(appointment.approvals ?? [])

  const payload = deepFreeze({ action, appointment, showing, approvals })
  return handlers.handleAction(payload)
}

module.exports = { dispatchEvent, utils, handlers }
