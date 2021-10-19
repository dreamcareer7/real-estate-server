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
const { strict: assert } = require('assert')
const emitter = require('./emitter')

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

const utils = (function () {
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
   * @template T
   * @param {T} actual
   * @returns {(...values: T[]) => boolean}
   */
  function predicate (actual) {
    return (...arr) => arr.includes(actual)
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
        if (utils.everyoneApproved(approvals, showing.roles)) {
          return 'Confirmed'
        }
        break
        
      default:
    }

    return appointment.status
  }

  return {
    validateTransition,
    everyoneApproved,
    findLatestApproval,
    send,
    patchStatus,
    predicate,
    guessNewStatus,
  }
})()

const handlers = (function () {
  /** @type {FsmHandler} */
  async function finalized ({ showing, appointment }) {
    const roles = await Role.getAll(showing.roles)
    
    for (const r of roles) {
      await clearNotifications(r.user_id, appointment.id)
    }  
  }

  /** @type {FsmHandler} */
  async function completed ({ appointment }) {
    await sendGetFeedbackTextMessageToBuyer(appointment.id)
    await utils.send(mailerFactory.forGetFeedbackEmail(appointment))

    emitter.emit('appointmentConfirmed', appointment.id)
  }

  /** @type {FsmHandler} */
  async function confirmed ({ appointment, approvals }) {
    const confirmedApproval = utils.findLatestApproval(approvals, true)
    if (!confirmedApproval) { return }

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
    const rejectedApproval = utils.findLatestApproval(approvals, false)
    assert(rejectedApproval, 'Impossible state')
    
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
    const canceledApproval = utils.findLatestApproval(approvals, false)
    assert(canceledApproval, 'Impossible state')

    await utils.send(mailerFactory.forCanceledAppointmentAfterConfirm(appointment))

    // XXX: Why we dont send any SMS here to buyer?!

    await sendAppointmentCanceledNotificationToOtherRoles(
      appointment.id,
      canceledApproval.role
    )

    emitter.emit('appointmentCancelled', appointment.id)
  }

  /** @type {FsmHandler} */
  async function handleAction (payload) {
    const { action, appointment } = payload

    const oldStatus = appointment.status
    const newStatus = utils.guessNewStatus(payload)
    if (newStatus === oldStatus) { return }

    utils.validateTransition(oldStatus, newStatus)
    await utils.patchStatus(appointment.id, newStatus)
    // XXX: what if request automatically confirmed?
    
    const was = utils.predicate(oldStatus)
    const gonna = utils.predicate(newStatus)
    
    if (action === 'ApprovalPerformed') {
      if (gonna('Confirmed')) { await handlers.confirmed(payload) }

      if (gonna('Canceled')) {
        if (was('Requested', 'Rescheduled')) { await handlers.rejected(payload) }
        if (was('Confirmed')) { await handlers.canceledAfterConfirm(payload) }
      }
    }

    if (gonna('Completed')) { await handlers.completed(payload) }
    if (gonna('Completed', 'Canceled')) { await handlers.finalized(payload) }
  }

  return {
    finalized,
    completed,
    confirmed,
    rejected,
    canceledAfterConfirm,
    handleAction,
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
