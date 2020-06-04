const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db.js')
const render = require('../../utils/render')
const promisify = require('../../utils/promisify')

const Daily = {}

Daily.sendDue = async () => {
  const { rows } = await db.query.promise('daily/due', [])

  const users = rows.map(r => r.user)

  await Promise.all(users.map(Daily.sendForUser))
}

Daily.sendForUser = async user_id => {
  const user = await User.get(user_id)

  const data = {
      user
  }
  const template = __dirname + '/../../mjml/daily/index.mjml'
  const html = await promisify(render.mjml)(template, data)

  await Email.create({
    from: config.email.from,
    to: [user.email],
    html,
    subject: 'Rechat Daily'
  })
}

// Daily.sendForUser = peanar.job({
//   handler: sendForUser,
//   queue: 'daily_email',
//   error_exchange: 'daily_email.error',
//   exchange: 'daily',
//   name: 'sendDaily'
// })

module.exports = Daily
