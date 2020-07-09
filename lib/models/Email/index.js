const Orm = require('../Orm')

const publicize = (model, { select }) => {
  /*
   * It would make our responses huge as sometimes we send thousands of these to clients.
   */
  const email = select.email
  if (!Array.isArray(email) || !email.includes('html')) delete model.html
  if (!Array.isArray(email) || !email.includes('text')) delete model.text
}

const Email = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./store'),
  ...require('./create'),
  ...require('./send'),
  ...require('./constants'),
  publicize
}

Orm.register('email', 'Email', Email)

module.exports = Email
