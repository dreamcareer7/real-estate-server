const expect = require('../../utils/validator').expect

const BrandSubscription = {
  ...require('../../models/Brand/subscription/get'),
  ...require('../../models/Brand/subscription/save'),
  ...require('../../models/Brand/subscription/pages')

}

const BrandCustomer = {
  ...require('../../models/Brand/customer/get'),
  ...require('../../models/Brand/customer/utils'),
}
const BillingPlan = require('../../models/BillingPlan')
const Context = require('../../models/Context')

const createSubscription = async (req, res) => {
  const customer = await BrandCustomer.getByBrand(req.params.id, req.user)
  const plan = await BillingPlan.get(req.body.plan)

  const error = 'This brand already has a subscription'

  const existing = await BrandSubscription.getByBrand(req.params.id)

  /* There is a unique constraint that would reject multiple subscriptions
   * for a singl brand.
   *
   * However, this endpoint creates a actual brand subscription on chargebee _before_ the
   * database insert, which will not be rolled back if it's not unique.
   *
   * Therefore, we cannot solely rely on db constraint hre.
   */

  if(existing)
    throw Error.Conflict(error)

  try {
    const subscription = await BrandSubscription.create({
      ...req.body,
      customer,
      plan,
      brand: req.params.id,
      created_by: req.user
    })

    res.model(subscription)

  } catch(e) {
    if (e.code === '23505')
      throw Error.Conflict(error)

    throw e
  }
}

const getCheckoutPage = async (req, res) => {
  const subscription = await BrandSubscription.get(req.params.sid)
  const customer = await BrandCustomer.get(subscription.customer)

  expect(req.user.id).to.equal(customer.user)

  const url = await BrandSubscription.getCheckoutUrl(subscription, req.body)
  res.redirect(url)
}

const getPortalPage = async (req, res) => {
  const customer = await BrandCustomer.getByBrand(req.params.id)

  expect(req.user.id).to.equal(customer.user)

  const { access_url } = await BrandCustomer.getPortalUrl(customer)
  res.redirect(access_url)
}

const cancelSubscription = async (req, res) => {
  const subscription = await BrandSubscription.get(req.params.sid)
  const customer = await BrandCustomer.get(subscription.customer)

  expect(req.user.id).to.equal(customer.user)

  await BrandSubscription.cancel(subscription)

  res.status(204)
  res.end()
}

const chargebeeWebhook = async (req, res) => {
  Context.log('Chargebe webhook called', req.body)

  const { content } = req.body

  expect(content).to.be.an('object')

  const { subscription, plan } = content

  const body = {}

  if (subscription)
    body['subscription'] = await BrandSubscription.sync(subscription.id)

  if (plan)
    body['plan'] = await BillingPlan.sync(plan.id)

  res.json(body)
}


const router = function ({app, b, access, am}) {
  app.post('/brands/:id/subscriptions', b, access, am(createSubscription))
  app.post('/brands/:id/subscriptions/:sid/cancel', b, access, am(cancelSubscription))
  app.get('/brands/:id/subscriptions/:sid/checkout', b, access, am(getCheckoutPage))
  app.get('/brands/:id/subscriptions/portal', b, access, am(getPortalPage))
  app.post('/chargebee/webhook', am(chargebeeWebhook))
}

module.exports = router
