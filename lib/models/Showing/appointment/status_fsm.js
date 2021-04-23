const db = require('../../../utils/db')
const Approval = require('../approval/get')
const Appointment = require('../appointment/get')
const Showing = require('../showing/get')

class ShowingAppointmentStatusTransitionError extends Error {
  /**
   * @param {import('./types').AppointmentStatus} oldStatus 
   * @param {import('./types').AppointmentStatus} newStatus 
   */
  constructor(oldStatus, newStatus) {
    super(`Invalid status transition error from '${oldStatus}' to '${newStatus}'`)
  }
}

class ShowingAppointmentStatusError extends Error {
  /**
   * @param {import('./types').AppointmentStatus} oldStatus 
   */
  constructor(oldStatus) {
    super(`Invalid status transition error from '${oldStatus}'`)
  }
}

/** @type {[import('./types').AppointmentStatus, import('./types').AppointmentStatus][]} */
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
 * @param {import('./types').AppointmentStatus} status
 */
async function patchStatus(id, status) {
  return db.update('showing/appointment/update_status', [id, status])
}

/**
 * @param {UUID} appointment_id
 * @param {import('./types').AppointmentStatus=} newStatus
 */
async function updateStatus(appointment_id, newStatus) {
  const appointment = await Appointment.get(appointment_id)
  const showing = await Showing.get(appointment.showing)

  if (!newStatus) {
    const approvals = appointment.approvals ? await Approval.getAll(appointment.approvals) : []

    // If a role has rejected the appointment, cancel it
    if (approvals.some((a) => a.approved === false)) {
      newStatus = 'Canceled'
    }

    // If no approval is required, we confirm the appointment directly
    else if (showing.approval_type === 'None') {
      newStatus = 'Confirmed'
    }

    // If no one has made a decision, don't touch anything (Why are we even here?!)
    else if (approvals.length < 1) {
      newStatus = 'Requested'
    }

    // If approval from any role is enough, it should be considered as confirmed
    else if (showing.approval_type === 'Any') {
      newStatus = 'Confirmed'
    }

    // Otherwise, all roles need to have confirmed the appointment
    else if (approvals.map((a) => a.role).every((r) => showing.roles.includes(r))) {
      newStatus = 'Confirmed'
    } else {
      throw new ShowingAppointmentStatusError(appointment.status)
    }
  }

  if (appointment.status === newStatus) {
    return 0
  }

  const transition = VALID_TRANSITIONS.find((t) => t[0] === appointment.status && t[1] === newStatus)
  if (!transition) {
    throw new ShowingAppointmentStatusTransitionError(appointment.status, newStatus)
  }

  return await patchStatus(appointment_id, newStatus)
}

module.exports = {
  ShowingAppointmentStatusError,
  ShowingAppointmentStatusTransitionError,
  updateStatus,
}
