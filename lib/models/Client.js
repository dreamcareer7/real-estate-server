const db = require('../utils/db.js')
const Orm = require('./Orm/registry')

const Client = {}

Orm.register('client', 'Client', Client)

Client.get = async id => {
  const clients = await Client.getAll([id])

  if (clients.length < 1)
    throw Error.ResourceNotFound(`Client ${id} not found`)

  return clients[0]
}

Client.getAll = async client_ids => {
  const res = await db.query.promise('client/get', [client_ids])
  return res.rows
}

Client.publicize = client => {
  delete client.response
  delete client.secret
  delete client.status
  return client
}

Client.UPGRADE_AVAILABLE = 'UpgradeAvailable'
Client.UPGRADE_UNAVAILABLE = 'UpgradeUnavailable'
Client.UPGRADE_REQUIRED = 'UpgradeRequired'

module.exports = Client
