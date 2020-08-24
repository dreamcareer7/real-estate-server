const db = require('../../../utils/db')

const get = async id => {
  /** @type {IBrandEmail[]} */
  const emails = await getAll([id])
  if (emails.length < 1)
    throw Error.ResourceNotFound(`Brand Email ${id} not found`)

  return emails[0]
}

const getAll = async ids => {
  /** @type {IBrandEmail[]} */
  const res = await db.select('brand/email/get', [ids])
  return res
}

const getByBrand = async brand => {
  const ids = await db.selectIds('brand/email/by_brand', [brand])

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
