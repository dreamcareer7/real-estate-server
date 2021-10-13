const niy = () => new Error('Not implemented yet')

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */

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

const webhook = {
  async appointmentRequested (/** TODO: arguments? */ payload) {
    throw niy()
  },

  async appointmentStatusChanged (/** TODO: arguments? */ payload) {
    throw niy()
  },
}

module.exports = { emit, webhook }
