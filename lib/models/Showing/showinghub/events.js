const Context = require('../../Context')
const has = require('lodash/has')

const niy = () => new Error('Not implemented yet')

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */
/** @typedef {import('./types').WebhookEvent} WebhookEvent */
/** @typedef {import('./types').WebhookPayload} WebhookPayload */
/** @typedef {(appId: string, payload: WebhookPayload) => Promise<void>} WebhookHandler */

const emit = {
  /** @param {RechatShowing['id']} showingId */
  async showingCreated (showingId) {
    throw niy()
  },

  /** @param {RechatShowing['id']} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentConfirmed (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRequested (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentDenied (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentCancelled (apptId) {
    throw niy()
  },
}

const webhook = (function () {
  /** @type {Record<WebhookEvent, WebhookHandler>} */
  const handlers = {
    async ApplicationCreated (appId, payload) {
      throw niy()
    },
    
    async ShowListingCreated (appId, payload) {
      throw niy()
    },
    
    async AppointmentRequested (appId, payload) {
      throw niy()
    },
    
    async ShowListingChanged (appId, payload) {
      throw niy()
    },
    
    async ApplicationChanged (appId, payload) {
      throw niy()
    },
  }

  /** @type {WebhookHandler} */
  async function handle (appId, payload) {
    const event = payload?.webhookEvent ?? null
    
    if (!event) {
      return Context.log(`Missing webhook event: ${JSON.stringify(payload)}`)
    } else if (!has(handlers, event)) {
      return Context.log(`No handler found for webhook event: ${event}`)
    }

    return handlers[event](appId, payload)
  }

  return { handle, handlers }
})()

module.exports = { emit, webhook }
