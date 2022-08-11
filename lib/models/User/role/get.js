const _ = require('lodash')

const db = require('../../../utils/db')

const Brand = require('../../Brand/access')
const Context = require('../../Context')
const User = {
  ...require('../get'),
  ...require('../brand'),
}
const UserSetting = require('../setting/get')

const getForUser = async user_id => {
  const res = await db.query.promise('user/role/for-user', [user_id])

  return res.rows
}

/**
 * @param {UUID} user_id 
 */
const getActive = async (user_id) => {
  const active_brand = await User.getActiveBrand(user_id)
  if (!active_brand) return null

  await Brand.limitAccess({ brand: active_brand, user: user_id })
  const roles = await db.select('user/role/users-in-brand', [ active_brand ])
  const user_role = roles.find(r => r.user === user_id)
  const settings = await UserSetting.getOrCreateInBrand(user_id, active_brand)

  // For the team switcher, we want to exclude the CRM access, so that admins can't access
  // a team's contacts by default.
  // FIXME: this should be based on a setting
  const acl = user_role ? user_role.acl : _.without(_.union(roles.flatMap(r => r.acl)), 'CRM')

  if (_.isEmpty(acl)) {
    Context.warn('UserRole.getActive: computed acl was empty.')
  }
  if (_.isNil(acl)) {
    Context.warn('UserRole.getActive: computed acl was nil.')
  }

  return {
    id: `${user_id}_${active_brand}`,
    brand: active_brand,
    acl,
    settings,
    type: 'user_role',
    subscription: null,
  }
}


module.exports = {
  getForUser,
  getActive
}
