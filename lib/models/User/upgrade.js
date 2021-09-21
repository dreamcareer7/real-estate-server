const db = require('../../utils/db.js')

const { get } = require('./get')

const Emitter = require('../../utils/event_emitter')

/**
 * @param {UUID} user_id
 * @param {string} token
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
const addAgentWithToken = function (user_id, token, agent_id, cb) {
  get(user_id).nodeify((err, user) => {
    if (err) return cb(err)

    if (user.secondary_password !== token) return cb(Error.Unauthorized('Invalid credentials'))

    addAgent(user_id, agent_id, cb)
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
const addAgent = function (user_id, agent_id, cb) {
  db.query('user/add_agent', [user_id, agent_id], (err, user) => {
    if (err) return cb(err)

    cb(err, user)
  })
}

module.exports = {
  addAgentWithToken,
  addAgent,
}
