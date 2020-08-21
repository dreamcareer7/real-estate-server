const db = require('../../../utils/db')

const BrandCustomer = require('../customer/utils')
const BillingPlan = require('../../BillingPlan')
const ChargebeeSubscription = require('./chargebee')
const Context = require('../../Context/index')

const BrandSubscription = {
  ...require('./get')
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

BrandSubscription.cancel = async (subscription) => {
  return ChargebeeSubscription.cancel(subscription.chargebee_id)
}

module.exports = BrandSubscription
