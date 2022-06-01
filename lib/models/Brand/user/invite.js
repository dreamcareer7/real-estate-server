const BrandRole = require('../role/get')
const BrandUser = {
  ...require('./update'),
  ...require('./get')
}

const User = {
  ...require('../../User/get'),
  ...require('../../User/create')
}

/**
 * @param {UUID} brand_id
 * @param {UUID} user_id
 */
async function inviteMember(brand_id, user_id) {
  if (!user_id) {
    throw Error.Validation('user is not provided')
  }

  if (!brand_id) {
    throw Error.Validation('brand is not provided')
  }
  
  const user = await User.get(user_id)
  const user_type = User.getLogicalType(user)
  if (user_type !== 'EmailShadowUser') {
    throw Error.Validation('User needs to be an email shadow user.')
  }

  const link = await User.getActivationLink({ user, agent: null })
  await User.sendUserInvitation(user, brand_id, link)
  await updateLastInvited(brand_id, user_id)
}

async function updateLastInvited(brand, user) {
  const roles = await BrandRole.getByUser(brand, user)
  for (const role of roles) {
    const brand_user = await BrandUser.getByRoleAndUser(role, user)
    await BrandUser.updateLastInvited(brand_user)
  }
}

module.exports = {
  inviteMember,
}
