const db = require('../../../utils/db')

const get = async id => {
  const webhooks = await getAll([id])
  if (webhooks.length < 1)
    throw Error.ResourceNotFound(`Brand Webhook Type ${id} not found`)

  return webhooks[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/webhook/get', [ids])
  return res.rows
}

const findInParents = async (brand, topic) => {
  const ids = await db.selectIds('brand/webhook/find_in_parents', [brand, topic])
  return getAll(ids)
}

/**
 * @param {UUID[]} brands 
 * @param {'Deals' | 'Showings' | 'Contacts'} topic 
 */
const find = async (brands, topic) => {
  const ids = await db.selectIds('brand/webhook/find', [brands, topic])
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  find,
  findInParents
}
