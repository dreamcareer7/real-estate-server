const db = require('../../../utils/db')

const get = async id => {
  const customer = await getAll([id])
  if (customer.length < 1)
    throw Error.ResourceNotFound(`Customer ${id} not found`)

  return customer[0]
}

const getAll = async ids => {
  return await db.select('brand/customer/get', [ids])
}

module.exports = {
  get,
  getAll
}
