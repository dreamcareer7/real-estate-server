const Orm = require('../Orm/registry')
const { getAll } = require('./get')

const publicize = (model, { select }) => {
  /*
   * It would make our responses huge as sometimes we send thousands of these to clients.
   */
  const email = select.email
  if (!Array.isArray(email) || !email.includes('html')) delete model.html
  if (!Array.isArray(email) || !email.includes('text')) delete model.text
}

Orm.register('email', 'Email', {
  getAll,
  publicize
})
