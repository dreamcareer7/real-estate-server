const crypto = require('crypto')

const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')

const { get } = require('./get')

const create = async webhook => {
  const key = await promisify(crypto.generateKey)('hmac', {length: 256})

  const id = await db.insert('brand/webhook/insert', [
    webhook.brand,
    webhook.topic,
    key.export().toString('hex'),
    webhook.url
  ])

  return get(id)
}


module.exports = {
  create
}
