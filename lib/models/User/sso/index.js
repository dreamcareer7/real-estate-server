/**
 * @namespace SsoProvider
 */


const SsoProvider = {
  ...require('./get'),
  ...require('./sso'),
}


module.exports = SsoProvider
