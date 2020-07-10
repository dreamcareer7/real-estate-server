const expect = require('../../utils/validator').expect

const BrandSubscription = require('../../models/Brand/subscription')
const ChargebeeSubscription = require('../../models/Brand/subscription/chargebee')
const BrandCustomer = require('../../models/Brand/customer')
const BillingPlan = require('../../models/BillingPlan')

const createSubscription = async (req, res) => {
  const subscription = await BrandSubscription.create({
    ...req.body,
    brand: req.params.id,
    created_by: req.user
  })

  res.model(subscription)
}

const getCheckoutPage = async (req, res) => {
  const subscription = await BrandSubscription.get(req.params.sid)
  const chargebee = await ChargebeeSubscription.get(subscription.chargebee)
  const customer = await BrandCustomer.get(chargebee.customer)

  expect(req.user.id).to.equal(customer.user)

  const url = await BrandSubscription.getCheckoutUrl(subscription, req.body)
  res.redirect(url)
}

const chargebeeWebhook = async (req, res) => {
  const { content } = req.body

  expect(content).to.be.an('object')

  const { subscription, plan } = content

  const body = {}

  if (subscription)
    body['subscription'] = await ChargebeeSubscription.sync(subscription.id)

  if (plan)
    body['plan'] = await BillingPlan.sync(plan.id)

  res.json(body)
}


const router = function ({app, b, access, am}) {
  app.post('/brands/:id/subscriptions', b, access, am(createSubscription))
  app.get('/brands/:id/subscriptions/:sid/checkout', b, access, am(getCheckoutPage))
  app.post('/chargebee/webhook', am(chargebeeWebhook))
}

module.exports = router
