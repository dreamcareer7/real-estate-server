const db = require('../../utils/db.js')

const { get } = require('./get')

const Emitter = require('../../utils/event_emitter')

/**
 * @param {UUID} user_id
 * @param {string} token
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
const upgradeToAgentWithToken = function (user_id, token, agent_id, cb) {
  get(user_id).nodeify((err, user) => {
    if (err) return cb(err)

    if (user.secondary_password !== token) return cb(Error.Unauthorized('Invalid credentials'))

    upgradeToAgent(user_id, agent_id, cb)
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
const upgradeToAgent = function (user_id, agent_id, cb) {
  db.query('user/upgrade_to_agent', [user_id, agent_id], (err, user) => {
    if (err) return cb(err)

    Emitter.emit('User:upgrade', user_id)

    cb(err, user)
  })
}

module.exports = {
  upgradeToAgentWithToken,
  upgradeToAgent,
}
