const db = require('../../utils/db')


const get = async id => {
  const plans = await getAll([id])
  if (plans.length < 1)
    throw Error.ResourceNotFound(`Billing Plan ${id} not found`)

  return plans[0]
}

const getAll = async ids => {
  return await db.select('billing_plan/get', [ids])
}

const getByChargebeeId = async chargebee_id => {
  const found = await db.selectOne('billing_plan/get-by-chargebee-id', [
    chargebee_id
  ])

  if (found) {
    return get(found.id)
  }
}


module.exports = {
  get,
  getAll,
  getByChargebeeId
}