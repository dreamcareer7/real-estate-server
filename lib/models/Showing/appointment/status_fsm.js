const db = require('../../../utils/db')
const Approval = require('../approval/get')
const Appointment = require('../appointment/get')
const Showing = require('../showing/get')

/**
 * @param {UUID} id
 * @param {import('./types').AppointmentStatus} status
 */
async function patchStatus(id, status) {
  return db.update('showing/appointment/update_status', [id, status])
}

/**
 * @param {UUID} appointment_id
 */
async function updateStatus(appointment_id) {
  const appointment = await Appointment.get(appointment_id)
  const showing = await Showing.get(appointment.showing)
  const approvals = appointment.approvals ? await Approval.getAll(appointment.approvals) : []

  // If a role has rejected, we cancel the appointment
  if (approvals.some(a => a.approved === false)) {
    return patchStatus(appointment_id, 'Canceled')
  }

  // If no approval is required, we confirm the appointment directly
  if (showing.approval_type === 'None') {
    return patchStatus(appointment_id, 'Confirmed')
  }

  // If no one has made a decision, don't touch anything (Why are we even here?!)
  if (approvals.length < 1) {
    return 0
  }

  // If approval from any role is enough, it should be considered as confirmed
  if (showing.approval_type === 'Any') {
    return patchStatus(appointment_id, 'Confirmed')
  }

  // Otherwise, all roles need to have approved
  if (approvals.map(a => a.role).every(r => showing.roles.includes(r))) {
    return patchStatus(appointment_id, 'Confirmed')
  }

  return 0
}

module.exports = {
  updateStatus
}
