const chargebee = require('chargebee')
const db = require('../../../utils/db')
const Orm = require('../../Orm')
const config = require('../../../config')

const BrandCustomer = require('../customer')
const BillingPlan = require('../../BillingPlan')

chargebee.configure(config.chargebee)

const BrandSubscription = {}

BrandSubscription.get = async id => {
  const subscription = await BrandSubscription.getAll([id])
  if (subscription.length < 1)
    throw Error.ResourceNotFound(`Subscription ${id} not found`)

  return subscription[0]
}

BrandSubscription.getAll = async ids => {
  return await db.select('brand/subscription/get', [ids])
}

BrandSubscription.create = async subscription => {
  const customer = await BrandCustomer.getByBrand(subscription.brand, subscription.created_by)
  const plan = await BillingPlan.get(subscription.plan)

  const data = {
    plan_id: plan.chargebee_id
  }

  const created = await chargebee.subscription.create_for_customer(customer.chargebee_id, data).request()

  const { rows } = await db.query.promise('brand/subscription/insert', [
    subscription.created_by.id,
    subscription.brand,
    subscription.user,
    customer.id,
    plan.id,
    created.subscription.status,
    created.subscription.id,
    JSON.stringify(created.subscription),
    Context.getId()
  ])

  return BrandSubscription.get(rows[0].id)
}

BrandSubscription.sync = async chargebee_id => {
  const { subscription } = await chargebee.subscription.retrieve(chargebee_id).request()

  const plan = await BillingPlan.getByChargebeeId(subscription.plan_id)
  await BrandCustomer.sync(subscription.customer_id)

  await db.query.promise('brand/subscription/update', [
    chargebee_id,
    plan.id,
    subscription.status,
    JSON.stringify(subscription),
    Context.getId()
  ])
}

BrandSubscription.getCheckoutUrl = async (subscription, options) => {
  const { embed } = options

  const data = {
    subscription: {
      id: subscription.chargebee_id
    },
    embed
  }

  const { hosted_page } = await chargebee.hosted_page.checkout_existing(data).request()
  return hosted_page.url
}

BrandSubscription.publicize = model => {
  delete model.chargebee_object
}

Orm.register('brand_subscription', 'BrandSubscription', BrandSubscription)

module.exports = BrandSubscription
