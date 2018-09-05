const promisify = require('../../utils/promisify')

const Orm = require('../Orm')
const User = require('../User/index')

const sql = require('./sql')

const { getTokenForUser } = require('./token')
const { getBrandsForUser } = require('./brand')

async function getUserById(user_id) {
  const raw = await promisify(User.get)(user_id)
  return Orm.populate({
    models: [raw]
  })
}

async function getUserByEmail(email) {
  const user_id = await sql.selectId('SELECT id FROM users WHERE email = $1', [
    email
  ])

  const populated = await getUserById(user_id)
  const user = populated[0]

  try {
    user.token = await getTokenForUser(email)
  } catch (ex) {
    //
  }

  try {
    user.teams = await getBrandsForUser(email)
  } catch (ex) {
    user.teams = []
  }

  return user
}

async function disconnectDocuSign(email) {
  await sql.update(`DELETE FROM docusign_users WHERE "user" = (
    SELECT id FROM users WHERE email = $1
  )`, [email])
}

module.exports = {
  getUserById,
  getUserByEmail,
  disconnectDocuSign
}