const User = require('../../../lib/models/User/get')

/**
 * @param {string} email 
 */
async function fetchUser(email) {
  const user = await User.getByEmail(email)

  if (!user) throw new Error('Minimal database has not been initialized!')

  return user
}

async function TestUser() {
  return fetchUser('test@rechat.com')
}

module.exports = {
  TestUser
}
