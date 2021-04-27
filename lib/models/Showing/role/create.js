const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const User = {
  ...require('../../User/get'),
  ...require('../../User/create'),
  ...require('../../User/patch'),
}
const Context = require('../../Context')


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
      /** @type {IUser=} */
      const user = await User.getByPhoneNumber(role.phone_number)
      if (user) {
        role.user = user.id
      } else {
        try {
          role.user = await promisify(User.create)({
            first_name: '',
            last_name: '',
            email: role.email,
            phone_number: role.phone_number,
            user_type: 'Client',
            is_shadow: true,
            skip_confirmation: true,
          })
        } catch (ex) {
          Context.log('Error while creating a user for a showing role:')
          Context.error(ex)
        }
      }
    }
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
