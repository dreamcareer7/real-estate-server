const { resetContactIntegration: resetGContactIntegration } = require('../Google/contact/support')
const { resetContactIntegration: resetMContactIntegration } = require('../Microsoft/contact/support')



/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const resetContactIntegration = async function (user, brand) {
  await resetGContactIntegration(user, brand)
  await resetMContactIntegration(user, brand)
}


module.exports = {
  resetContactIntegration
}