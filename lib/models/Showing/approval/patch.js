const db = require('../../../utils/db')
const Role = require('../role/get')

/**
 * @param {UUID} role
 * @param {import('../appointment/types').ShowingAppointment} appointment
 * @param {import('./types').ShowingApprovalInput} approval
 */
async function insert(role, appointment, approval) {
  return db.insert('showing/appointment/insert', [
    /* $1 */ appointment.id,
    /* $2 */ role,
    /* $3 */ approval.approved,
    /* $4 */ appointment.time,
    /* $4 */ approval.comment,
  ])
}

/**
 * @param {UUID} user_id
 * @param {import('../appointment/types').ShowingAppointment} appointment
 * @param {import('./types').ShowingApprovalInput} approval
 */
async function patch(user_id, appointment, approval) {
  const roles = await Role.getByUser(appointment.id, user_id)
  if (roles.length == 0) {
    throw Error.Validation('You do not have a role in this showing!')
  }

  for (const role of roles) {
    await insert(role.id, appointment, approval)
  }

  // FIXME: send a `UserApprovedShowingAppointment` or
  // `UserRejectedShowingAppointment` based on approval.approved value
}

module.exports = {
  patch,
}
