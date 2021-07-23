const config = require('../../config.js')
const db = require('../../utils/db.js')
const Email = require('../Email/create')
const User = require('../User/get')
const { expect } = require('../../utils/validator')

const { generate } = require('./generate')

const setEmail = async (id, email) => {
  const { id: saved_id } = (await db.selectOne('daily/set-email', [id, email])) || {}
  expect(saved_id, `Daily ${id} has already been executed`).to.equal(id)
}

const send = async daily_id => {
  const user_id = await db.map('daily/get', [daily_id], 'user')

  const user = await User.get(user_id)

  const html = await generate(user)

  const email =  await Email.create({
    from: config.email.from,
    to: [user.email],
    html,
    tags: ['daily'],
    subject: 'Rechat Daily'
  })

  await setEmail(daily_id, email.id)

  return email.id
}

module.exports = {
  send
}
