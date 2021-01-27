const db = require('../../../utils/db')
const Context = require('../../Context')

/**
 * Locks a campaign record for updates
 * @param {UUID} id 
 */
const lock = async id => {
  Context.log('Acquiring lock for campaign', id)
  const { rows } = await db.query.promise('email/campaign/lock', [ id ])

  const [ lock ] = rows

  if (!lock)
    throw Error.Generic(`Lock not acquired for campaign ${id}`)

  if (lock.executed_at) {
    throw Error.Generic('Email Campaign Already Executed')
  }

  Context.log(`Lock acquired on campaign ${id}`)
}

module.exports = {
  lock,
}
