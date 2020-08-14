const db = require('../../../../utils/db')

const BrandCustomer = require('../../customer/utils')
const BillingPlan = require('../../../BillingPlan')
const chargebee = require('../../chargebee')
const Context = require('../../../Context/index')

const ChargebeeSubscription = {}

ChargebeeSubscription.get = async id => {
  const subscription = await ChargebeeSubscription.getAll([id])
  if (subscription.length < 1)
    throw Error.ResourceNotFound(`Chargebee subscription ${id} not found`)

  return subscription[0]
}

ChargebeeSubscription.getAll = async ids => {
  return await db.select('brand/subscription/chargebee/get', [ids])
}

ChargebeeSubscription.getOrCreate = async ({customer, plan}) => {
  const found = await db.selectOne('brand/subscription/chargebee/find', [
    customer.id,
    plan.id
  ])

  if (found)
    return ChargebeeSubscription.get(found.id)

  const data = {
    plan_id: plan.chargebee_id,
    plan_quantity: 1
  }

  const created = await chargebee.subscription.create_for_customer(customer.chargebee_id, data).request()

  const { rows } = await db.query.promise('brand/subscription/chargebee/insert', [
    Context.getId(),
    plan.id,
    customer.id,
    created.subscription.status,
    created.subscription.id,
    JSON.stringify(created.subscription)
  ])

  return ChargebeeSubscription.get(rows[0].id)
}

ChargebeeSubscription.sync = async chargebee_id => {
  const { subscription } = await chargebee.subscription.retrieve(chargebee_id).request()

  const plan = await BillingPlan.getByChargebeeId(subscription.plan_id)
  await BrandCustomer.sync(subscription.customer_id)

  await db.query.promise('brand/subscription/chargebee/update', [
    Context.getId(),
    chargebee_id,
    plan.id,
    subscription.status,
    JSON.stringify(subscription)
  ])
}

ChargebeeSubscription.updateQuantity = async id => {
  const s = await ChargebeeSubscription.get(id)

  const { quantity } = await db.selectOne('brand/subscription/chargebee/get-quantity', [
    id
  ])

  await chargebee.subscription.update(s.chargebee_id, {
    plan_quantity: quantity
  }).request()
}

ChargebeeSubscription.cancel = async chargebee_id => {
  await chargebee.subscription.cancel(chargebee_id).request()
}

ChargebeeSubscription.getCheckoutUrl = async (id, options) => {
  const { embed } = options

  const data = {
    subscription: {
      id
    },
    embed
  }

  const { hosted_page } = await chargebee.hosted_page.checkout_existing(data).request()
  return hosted_page.url
}

// No Orm.register for this model as it's not supposed to be exposed.

module.exports = ChargebeeSubscription
