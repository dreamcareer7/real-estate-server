/**
 * @namespace ContactIntegration
 */


const ContactIntegration = {
  ...require('./get'),
  ...require('./insert'),
  ...require('./delete'),
  ...require('./update')
}


module.exports = ContactIntegration