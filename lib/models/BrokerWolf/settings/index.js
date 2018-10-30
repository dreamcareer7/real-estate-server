const db = require('../../../utils/db')

BrokerWolf.Settings = {}

BrokerWolf.Settings.save = async settings => {
  const {
    brand,
    api_token,
    consumer_key,
    secret_key,
    client_code,
    host
  } = settings

  return db.query.promise('brokerwolf/settings/save', [
    brand,
    api_token,
    consumer_key,
    secret_key,
    client_code,
    host
  ])
}

BrokerWolf.Settings.getByBrand = async brand => {
  const res = await db.query.promise('brokerwolf/settings/by-brand', [brand])

  return res.rows[0]
}
