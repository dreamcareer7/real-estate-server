const db = require('../../utils/db')
const Context = require('../Context')

/**
 * Locks a campaign record for updates
 * @param {UUID} id 
 */
const lock = async id => {
  Context.log('Acquiring lock for social post', id)
  const { rows } = await db.query.promise('social_post/lock', [ id ])

  const [ lock ] = rows

  if (!lock)
    throw Error.Generic(`Lock not acquired for social post ${id}`)

  if (lock.executed_at) {
    const err = Error.Generic('social post Already Executed')
    err.retry = false
    throw err
  }

  Context.log(`Lock acquired on social post ${id}`)
}

module.exports = {
  lock,
}
