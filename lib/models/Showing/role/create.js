const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const User = {
  ...require('../../User/create'),
  ...require('../../User/patch'),
}


/**
 * @param {UUID} user 
 * @param {UUID} showing 
 * @param {import('./types').ShowingRoleInput[]} roles 
 */
async function insert(user, showing, roles) {
  return db.insert('showing/role/insert', [
    /* $1 */ user,
    /* $2 */ showing,
    /* $3 */ JSON.stringify(roles),
  ])  
}

/**
 * @param {UUID} user 
 * @param {UUID} showing 
 * @param {import('./types').ShowingRoleInput[]} roles 
 */
async function create(user, showing, roles) {
  for (const role of roles) {
    if (!role.user) {
      /** @type {IUser} */
      const user = await promisify(User.getOrCreateByPhoneNumber)(role.phone_number)
      try {
        await promisify(User.patch)(user.id, { ...user, email: role.email })
      } catch (ex) {

      }
      role.user = user.id
    }
  }

  try {
    return await insert(user, showing, roles)
  } catch (ex) {
    switch (ex.constraint) {
      case 'sr_confirm_notification_type':
        throw Error.Validation('At least one notification type is required for roles who can approve an appointment')
      default:
        throw ex
    }
  }
}

module.exports = {
  create,
}
