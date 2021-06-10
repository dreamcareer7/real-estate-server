const promisify = require('../../../utils/promisify')
const Context = require('../../Context')

const User = {
  ...require('../../User/get'),
  ...require('../../User/create'),
  ...require('../../User/patch'),
}

/**
 * @param {import("./types").ShowingRoleInput} role 
 * @returns {Promise<UUID | undefined>}
 */
async function connectToUser(role) {
  /** @type {IUser=} */
  const user = await User.getByPhoneNumber(role.phone_number)
  if (user) {
    return user.id
  }

  try {
    return await promisify(User.create)({
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

module.exports = {
  connectToUser
}
