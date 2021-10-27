const db = require('../../../utils/db')

const { get } = require('./get')
const { connectToUser } = require('./user')

/**
 * @param {UUID} id 
 * @param {import('./types').ShowingRoleInput} data 
 */
async function update(id, data) {
  const current = await get(id)

  if (!current) {
    throw Error.ResourceNotFound('Showing role does not exist')
  }

  if (!data.user || current.user_id !== data.user) {
    data.user = await connectToUser(data)
  }

  try {
    await db.update('showing/role/update', [
      /* $1  */ id,
      /* $2  */ data.role,
      /* $3  */ data.user,
      /* $4  */ data.agent,
      /* $5  */ data.confirm_notification_type,
      /* $6  */ data.cancel_notification_type,
      /* $7  */ data.can_approve,
      /* $8  */ data.first_name,
      /* $9  */ data.last_name,
      /* $10 */ data.email,
      /* $11 */ data.phone_number
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
