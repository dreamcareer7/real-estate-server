const db = require('../../../utils/db')
const { updateStatus } = require('../appointment/status_fsm')
const Role = require('../role/get')
const Showing = require('../showing/access')
const Appointment = {
  ...require('../appointment/get'),
  ...require('../appointment/status_fsm'),
}

/**
 * @param {UUID} role
 * @param {import('../appointment/types').ShowingAppointment} appointment
 * @param {import('./types').ShowingApprovalInput} approval
 */
async function insert(role, appointment, approval) {
  return db.query.promise('showing/approvals/insert', [
    /* $1 */ appointment.id,
    /* $2 */ role,
    /* $3 */ approval.approved,
    /* $4 */ appointment.time,
    /* $5 */ approval.comment,
  ])
}

/**
 * @param {UUID} user_id
 * @param {UUID} appointment_id
 * @param {import('./types').ShowingApprovalInput} approval
 */
async function patch(user_id, appointment_id, approval) {
  const appointment = await Appointment.get(appointment_id)
  if (appointment.status === 'Canceled' || appointment.status === 'Completed') {
    throw Error.Validation('Cannot change approval status on a concluded appointment.')
  }

  const canApprove = await Showing.hasAccess(appointment.showing, user_id, true)
  if (!canApprove) {
    throw Error.Validation('You are not allowed to approve or reject an appointment on this showing!')
  }

  const roles = await Role.getByUser(appointment.showing, user_id)
  if (roles.length === 0) {
    throw Error.Validation('You do not have a role in this showing!')
  }

  for (const role of roles) {
    await insert(role.id, appointment, approval)
  }

  await updateStatus(appointment_id, 'ShowingRole')

  // FIXME: send a `UserApprovedShowingAppointment` or
  // `UserRejectedShowingAppointment` based on approval.approved value
}

module.exports = {
  patch,
}
