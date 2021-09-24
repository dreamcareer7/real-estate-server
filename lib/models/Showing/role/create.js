const { strict: assert } = require('assert')
const db = require('../../../utils/db')
const User = require('../../User/get')
const Agent = require('../../Agent/get')
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
 * @param {ShowingRoleInput['agent']} agentId
 * @returns {Promise<ShowingRoleInput['user']>}
 */
async function guessUserId (agentId) {
  if (!agentId) { return undefined }
  const userIds = await User.getIdsByAgentId(agentId)

  if (userIds.length === 1) { return userIds[0] }
  
  if (!userIds.length) {
    throw Error.Validation(`No associated user was found for agent ${agentId}`)
  }
  
  throw Error.Validation(`The user is required since several users found for agent ${agentId}`)
}

/** 
 * @param {ShowingRoleInput['user']} userId
 * @return {Promise<ShowingRoleInput['agent']>}
 */
async function guessAgentId (userId) {
  if (!userId) { return undefined }
  const agentIds = await Agent.getIdsByUserId(userId)

  if (agentIds.length < 2) { return agentIds[0] ?? null }

  throw Error.Validation(`The agent is required since user ${userId} has got several agents`)
}

/**
 * @param {IUser['id']} userId
 * @param {IAgent['id']} agentId
 */
async function ensureAssociation (userId, agentId) {
  assert(userId, 'userId must be truthy')
  assert(agentId, 'agentId must be truthy')

  const agentIds = await Agent.getIdsByUserId(userId)
  if (agentIds.includes(agentId)) { return }

  throw Error.Validation(`Agent ${agentId} does not belong to user ${userId}`)
}

/** @param {ShowingRoleInput[]} roles */
async function prepareRoleInputs (roles) {
  for (const role of roles) {
    if (role.agent && !role.user) {
      role.user = await guessUserId(role.agent)
    } else if (!role.agent && role.user) {
      role.agent = await guessAgentId(role.user)
    } else if (role.agent && role.user) {
      await ensureAssociation(role.user, role.agent)
    } else if (!role.agent && !role.user) {
      role.user = await connectToUser(role)
      role.agent = await guessAgentId(role.user)
    }
  }  
}

/**
 * @param {UUID} user 
 * @param {UUID} showing 
 * @param {ShowingRoleInput[]} roles 
 */
async function create(user, showing, roles) {
  await prepareRoleInputs(roles)

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
