const deepmerge = require('deepmerge')
const promisify = require('../../../lib/utils/promisify')

const Deal = require('../../../lib/models/Deal')
const DealChecklist = require('../../../lib/models/Deal/checklist')

const { getBrandContexts, getBrandChecklists } = require('./brand')

const default_checklist_values = {
  title: 'Checklist',
  is_deactivated: false,
  is_terminated: false,
}

const default_values = {
  deal_type: 'Buying',
  property_type: 'Resale',

  checklists: [],
  roles: []
}

async function createDeal(user_id, brand_id, data) {
  data = deepmerge(default_values, data)

  const { roles, checklists, ...deal_props } = data

  const brand_contexts = await getBrandContexts(brand_id)
  const brand_checklists = await getBrandChecklists(brand_id)

  const deal = await Deal.create({
    ...deal_props,
    created_by: user_id
  })

  for (let i = 0; i < checklists.length; i++) {
    const {context, ...c} = checklists[i]
    const cl_data = deepmerge.all([default_checklist_values, c, {
      deal: deal.id,
      order: i + 1,
      origin: brand_checklists[0].id
    }])

    const cl = await DealChecklist.create(cl_data)

    if (context) {
      await Deal.saveContext({
        deal: deal.id,
        user: user_id,
        context: Object.keys(context).map(key => ({
          definition: brand_contexts[key].id,
          value: context[key].value,
          approved: context[key].approved,
          checklist: cl.id
        }))
      })
    }
  }

  for (const r of roles) {
    await promisify(Deal.addRole)({
      ...r,
      deal: deal.id,
      created_by: user_id,
      user: user_id
    })
  }

  return promisify(Deal.get)(deal.id)
}

module.exports = {
  createDeal
}
