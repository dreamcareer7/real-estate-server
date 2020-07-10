const db = require('../../utils/db')
const Orm = require('../Orm')

const BillingPlan = {}

BillingPlan.get = async id => {
  const plans = await BillingPlan.getAll([id])
  if (plans.length < 1)
    throw Error.ResourceNotFound(`Billing Plan ${id} not found`)

  return plans[0]
}

BillingPlan.getAll = async ids => {
  return await db.select('billing_plan/get', [ids])
}

BillingPlan.create = async (plan) => {
  const { rows } = await db.query.promise('billing_plan/insert', [
    plan.acl,
    plan.chargebee_id
  ])

  return BillingPlan.get(rows[0].id)
}

BillingPlan.getByChargebeeId = async chargebee_id => {
  const { id } = await db.selectOne('billing_plan/get-by-chargebee-id', [
    chargebee_id
  ])

  return BillingPlan.get(id)
}


Orm.register('billing_plan', 'BillingPlan', BillingPlan)

module.exports = BillingPlan
