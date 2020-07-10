const db = require('../../utils/db')
const Orm = require('../Orm')
const chargebee = require('../Brand/chargebee')

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
    plan.chargebee_id,
    plan.chargebee_object
  ])

  return BillingPlan.get(rows[0].id)
}

BillingPlan.getByChargebeeId = async chargebee_id => {
  const found = await db.selectOne('billing_plan/get-by-chargebee-id', [
    chargebee_id
  ])

  if (found)
    return BillingPlan.get(found.id)
}

BillingPlan.getOrCreate = async chargebee_object => {
  const found = await BillingPlan.getByChargebeeId(chargebee_object.id)

  if (found)
    return BillingPlan.get(found.id)

  const data = {
    acl: [],
    chargebee_id: chargebee_object.id,
    chargebee_object
  }

  return BillingPlan.create(data)
}

BillingPlan.sync = async chargebee_id => {
  const chargebee_object = await chargebee.plan.retrieve(chargebee_id).request()

  const plan = await BillingPlan.getOrCreate(chargebee_object)

  await db.query.promise('billing_plan/update', [
    plan.id,
    plan.acl,
    chargebee_id,
    chargebee_object
  ])

  return BillingPlan.get(plan.id)
}

Orm.register('billing_plan', 'BillingPlan', BillingPlan)

module.exports = BillingPlan
