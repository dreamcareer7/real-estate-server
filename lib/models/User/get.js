const db = require('../../utils/db.js')
const _u = require('underscore')
const ObjectUtil = require('../ObjectUtil')
const SocketServer = require('../../socket')

const {
  OFFLINE
} = require('./constants')

const get = async function(user_id) {
  const users = await getAll([user_id])

  if (users.length < 1)
    throw Error.ResourceNotFound(`User ${user_id} not found`)

  return users[0]
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<IUser[]>}
 */
const getAll = async function(ids) {
  return db.map('user/get', [ids], user => {
    user.display_name = getDisplayName(user)
    user.abbreviated_display_name = getAbbreviatedDisplayName(user)

    user.online_state = SocketServer.ready ? SocketServer.getUserStatus(user) : OFFLINE

    return user
  })
}

const getDisplayName = function(user) {
  if (!_u.isEmpty(user.first_name) || !_u.isEmpty(user.last_name))
    return [user.first_name, user.last_name].join(' ')

  if (!_u.isEmpty(user.email) && !user.fake_email) return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

const getAbbreviatedDisplayName = function(user) {
  if (!_u.isEmpty(user.first_name) && !_u.isEmpty(user.last_name))
    return user.first_name

  if (!_u.isEmpty(user.email) && !user.fake_email) return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

const getByEmail = async function(email) {
  const ids = await db.selectIds('user/get_by_email', [email])

  if (ids.length < 1) return undefined

  return get(ids[0])
}

const getByPhoneNumber = async function(phone) {
  const rows = await db.select('user/get_by_phone', [
    ObjectUtil.formatPhoneNumberForDialing(phone)
  ])

  if (rows.length < 1) return

  return get(rows[0].id)
}

const getByAgentId = async function(agent) {
  const ids = await db.selectIds('user/get_by_agent', [agent])

  if (ids.length < 1) return undefined

  return get(ids[0])
}

/**
 * @param {IUserBase} user
 * @returns {TUserLogicalType}
 */
const getLogicalType = function(user) {
  if (user.email && !user.is_shadow && !user.fake_email) return 'RegisteredUser'
  else if (user.email && user.is_shadow && !user.fake_email)
    return 'EmailShadowUser'
  else if (user.phone_number && user.is_shadow && user.fake_email)
    return 'PhoneShadowUser'

  return 'Unknown'
}


module.exports = {
  get,
  getAll,
  getDisplayName,
  getAbbreviatedDisplayName,
  getByEmail,
  getByPhoneNumber,
  getByAgentId,
  getLogicalType,
}
