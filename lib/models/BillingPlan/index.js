const db = require('../../utils/db')
const chargebee = require('../Brand/chargebee')


const BillingPlan = {
  ...require('./get'),

  sync: async chargebee_id => {
    const { plan } = await chargebee.plan.retrieve(chargebee_id).request()
  
    const { rows } = await db.query.promise('billing_plan/set', [
      [],
      plan.id,
      JSON.stringify(plan)
    ])
  
    return BillingPlan.get(rows[0].id)
  }
}


module.exports = BillingPlan