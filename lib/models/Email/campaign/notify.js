const Socket = require('../../Socket')
const Context = require('../../Context')

/**
 * @param {string} event 
 * @param {UUID} user 
 * @param {UUID} brand 
 * @param {UUID[]} ids 
 * @param {*} data 
 */
const notify = (event, user, brand, ids, data = {}) => {
  Socket.send(
    event,
    brand,
    [{ user, brand, ids, ...data }],

    err => {
      if (err) Context.error(`Error sending ${event} socket event.`, err)
    }
  )
}

module.exports = {
  notify,
}
