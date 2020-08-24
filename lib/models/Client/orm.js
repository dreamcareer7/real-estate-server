const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const publicize = client => {
  delete client.response
  delete client.secret
  delete client.status
  return client
}

Orm.register('client', 'Client', {
  getAll,
  publicize
})

module.exports = {
  publicize
}
