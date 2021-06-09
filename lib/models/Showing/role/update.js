const db = require('../../../utils/db')

const { get } = require('./get')
const { connectToUser } = require('./user')

/**
 * @param {UUID} user 
 * @param {UUID} id 
 * @param {import('./types').ShowingRoleInput} data 
 */
async function update(user, id, data) {
  const current = await get(id)

  if (!current) {
    throw Error.ResourceNotFound('Showing role does not exist')
  }

  if (!data.user || current.user_id !== data.user) {
    data.user = await connectToUser(data)
  }

  try {
    await db.update('showing/role/update', [
      id,
      user,
      data.role,
      data.user,
      data.confirm_notification_type,
      data.cancel_notification_type,
      data.can_approve,
      data.first_name,
      data.last_name,
      data.email,
      data.phone_number
    ])
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
  update,
}
