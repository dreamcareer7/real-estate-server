const am = require('../utils/async_middleware.js')
const BillingPlan = require('../models/BillingPlan/get')

const getAll = async (req, res) => {
  const plans = await BillingPlan.getPublics()

  return res.collection(plans)
}


const router = function (app) {
  app.get('/billing_plans', am(getAll))
}

module.exports = router
