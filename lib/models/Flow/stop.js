const db   = require('../../utils/db')
const emitter  = require('./emitter')
const { get } = require('./get')

/**
 * Stops a flow from moving forward. Removes all future events and scheduled emails.
 * @param {UUID} user_id 
 * @param {UUID} flow_id 
 */
const stop = async (user_id, flow_id) => {
  const flow = await get(flow_id)

  await db.update('flow/delete', [
    flow_id,
    user_id
  ])

  emitter.emit('stop', { flow_id, user_id, brand_id: flow.brand })
}

module.exports = {
  stop,
}
