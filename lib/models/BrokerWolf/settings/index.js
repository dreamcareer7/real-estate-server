const db = require('../../../utils/db')

const save = async settings => {
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

const getByBrand = async brand => {
  const res = await db.query.promise('brokerwolf/settings/by-brand', [brand])

  return res.rows[0]
}

module.exports = {
  save,
  getByBrand
}
