const { CancellationReasonType } = require('./api')
const config = require('../../../config')

const webhook = require('./webhook')

const AppointmentEvents = require('../appointment/emitter')
const ShowableListing = require('./showable_listing')
const AppointmentRequest = require('./appointment')

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../role/types').ShowingRole} RechatShowingRole */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */
/** @typedef {import('./types').WebhookEvent} WebhookEvent */
/** @typedef {import('./types').WebhookPayload} WebhookPayload */
/** @typedef {import('./types').ShowableListingRequest} ShowableListingRequest */
/** @typedef {(appId: string, payload: WebhookPayload) => Promise<void>} WebhookHandler */
/** @typedef {import('../availability/types').ShowingAvailability} RechatShowingAvailability */
/** @typedef {import('./api').ShowListingResult} ShowListingResult */
/** @typedef {import('./api').RequestResult} RequestResult */
/** @typedef {import('./types').CommonApiResult} CommonApiResult */

const mockEmit = {
  /** @param {UUID} showingId */
  showingCreated(showingId) {},

  /** @param {UUID} showingId */
  showingUpdated(showingId) {},

  /** @param {UUID} apptId */
  appointmentConfirmed(apptId) {},

  /** @param {UUID} apptId */
  appointmentDenied(apptId) {},

  /**
   * @param {UUID} apptId
   * @param {CancellationReasonType=} [reason=CancellationReasonType.Other]
   */
  appointmentCancelled(apptId, reason = CancellationReasonType.Other) {},

  /** @param {UUID} apptId */
  async appointmentRescheduled(apptId) {},
}

const emit = {
  /** @param {UUID} showingId */
  showingCreated(showingId) {
    return ShowableListing.create(showingId)
  },

  /** @param {UUID} showingId */
  showingUpdated(showingId) {
    return ShowableListing.update(showingId)
  },

  /** @param {UUID} apptId */
  appointmentConfirmed(apptId) {
    return AppointmentRequest.confirm(apptId)
  },

  /** @param {UUID} apptId */
  appointmentDenied(apptId) {
    return AppointmentRequest.reject(apptId)
  },

  /**
   * @param {UUID} apptId
   * @param {CancellationReasonType=} [reason=CancellationReasonType.Other]
   */
  appointmentCancelled(apptId, reason = CancellationReasonType.Other) {
    return AppointmentRequest.cancel(apptId, reason)
  },

  /** @param {UUID} apptId */
  async appointmentRescheduled(apptId) {
    await emit.appointmentCancelled(apptId, CancellationReasonType.Reschedule)
    await emit.appointmentRequested(apptId)
  },
}

function attachEventHandlers() {
  const { emit } = module.exports
  AppointmentEvents.on('appointmentConfirmed', emit.appointmentConfirmed)
  AppointmentEvents.on('appointmentCancelled', emit.appointmentCancelled)
  AppointmentEvents.on('appointmentDenied', emit.appointmentDenied)
}

module.exports = {
  attachShowingAppointmentEventHandlers: attachEventHandlers,
  emit: config.showinghub?.enabled ? emit : mockEmit,
  webhook,
}
