const db = require('../../../utils/db')
const { connectToUser } = require('./user')

/** @typedef {import('./types').ShowingRoleInput} ShowingRoleInput */

/**
 * @param {UUID} user 
 * @param {UUID} showing 
 * @param {ShowingRoleInput[]} roles 
 */
async function insert(user, showing, roles) {
  return db.selectIds('showing/role/insert', [
    /* $1 */ user,
    /* $2 */ showing,
    /* $3 */ JSON.stringify(roles),
  ])  
}

/**
 * @param {UUID} user 
 * @param {UUID} showing 
 * @param {ShowingRoleInput[]} roles 
 */
async function create(user, showing, roles) {
  for (const role of roles) {
    if (role.user) { continue }

    if (role.agent != null) {
      throw Error.Validation('agent must be nil when user is not provided')
    }

    role.user = await connectToUser(role)
  }
  
  try {
    return await insert(user, showing, roles)
  } catch (ex) {
    switch (ex.constraint) {
      case 'sr_confirm_notification_type':
        throw Error.Validation('At least one notification type is required for roles who can approve an appointment')
      case 'sr_unique_seller_agent':
        throw Error.Validation('Only one seller agent role can be specified for a showing')
      default:
        throw ex
    }
  }
}

module.exports = {
  create,
}
