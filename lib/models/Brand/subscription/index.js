const db = require('../../../utils/db')
const Orm = require('../../Orm')

const BrandCustomer = require('../customer')
const BillingPlan = require('../../BillingPlan')
const ChargebeeSubscription = require('./chargebee')

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

  const chargebee = await ChargebeeSubscription.getOrCreate({
    customer,
    plan
  })

  const { rows } = await db.query.promise('brand/subscription/insert', [
    subscription.created_by.id,
    Context.getId(),
    subscription.brand,
    subscription.user,
    chargebee.id,
  ])

  await ChargebeeSubscription.updateQuantity(chargebee.id)

  return BrandSubscription.get(rows[0].id)
}

BrandSubscription.getCheckoutUrl = async (subscription, options) => {
  return ChargebeeSubscription.getCheckoutUrl(subscription.chargebee_id, options)
}

Orm.register('brand_subscription', 'BrandSubscription', BrandSubscription)

module.exports = BrandSubscription
