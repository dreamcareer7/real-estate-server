const User = require('../../../lib/models/User/get')

/** @type {Record<string, IUser>} */
const cache = {}

/**
 * @param {string} email 
 * @returns {Promise<IUser>}
 */
async function fetchUser(email) {
  if (cache[email]) return cache[email]

  const user = await User.getByEmail(email)

  if (!user) throw new Error('Minimal database has not been initialized!')

  cache[email] = user
  return user
}

async function TestUser() {
  return fetchUser('test@rechat.com')
}

module.exports = {
  TestUser,
  fetchUser,
}
