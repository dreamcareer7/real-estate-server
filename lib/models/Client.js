const db = require('../utils/db.js')

Client = {}

Client.get = async id => {
  const res = await db.query.promise('client/get', [id])

  if (res.rows.length < 1)
    throw Error.ResourceNotFound(`Client ${id} not found`)

  return res.rows[0]
}

Client.UPGRADE_AVAILABLE = 'UpgradeAvailable'
Client.UPGRADE_UNAVAILABLE = 'UpgradeUnavailable'
Client.UPGRADE_REQUIRED = 'UpgradeRequired'