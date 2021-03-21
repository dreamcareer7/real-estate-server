const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db.js')
const User = require('../User/get')
const { send } = require('./send')

const Daily = {}

Daily.save = (items) => {
  return db.selectIds('daily/save', [JSON.stringify(items)])
}

Daily.sendDue = async () => {
  const users = await db.select('daily/due', [])

  const dailies = await Daily.save(users.map(user => {
    return {
      user: user.id,
      timezone: user.timezone
    }
  }))

  return Promise.all(dailies.map(d => Daily.queue(d)))
}

Daily.queue = peanar.job({
  handler: send,
  queue: 'daily_email',
  error_exchange: 'daily_email.error',
  exchange: 'daily',
  name: 'sendDaily'
})

Daily.sendForUser = async user_id => {
  const user = await User.get(user_id)

  const [ id ] = await Daily.save([
    {
      user: user.id,
      timezone: user.timezone
    }
  ])

  return Daily.queue(id)
}


module.exports = Daily
