const deepmerge = require('deepmerge')
const promisify = require('../../../lib/utils/promisify')

const Deal = require('../../../lib/models/Deal')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const DealRole = require('../../../lib/models/Deal/role')

const BrandHelper = require('../brand/helper')

const default_checklist_values = {
  is_deactivated: false,
  is_terminated: false
}

const default_values = {
  deal_type: 'Buying',
  property_type: 'Resale',

  checklists: [],
  roles: []
}

async function create(user_id, brand_id, data) {
  data = deepmerge(default_values, data)

  const { roles, checklists, ...deal_props } = data

  const brand_contexts = await BrandHelper.getContexts(brand_id)
  const brand_property_types = await BrandHelper.getPropertyTypes(brand_id)
  const property_type = brand_property_types[deal_props.property_type]
  const brand_checklists = await BrandHelper.getChecklists(property_type.checklists)

  let deal = await Deal.create({
    ...deal_props,
    created_by: user_id,
    brand: brand_id,
    property_type: property_type.id
  })

  for (let i = 0; i < checklists.length; i++) {
    const {
      context,
      checklist_type = checklists[i].checklist_type ?? deal.deal_type,
      property_type = deal.property_type,
      ...c
    } = checklists[i]

    const origin = brand_checklists.find(
      bc => bc.checklist_type === checklist_type && bc.property_type === property_type
    )

    const cl_data = deepmerge.all([
      default_checklist_values,
      {
        title: origin.title
      },
      c,
      {
        deal: deal.id,
        order: i + 1,
      }
    ])

    const cl = await DealChecklist.createWithTasks(cl_data, {
      checklist_type,
      property_type
    })

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
    await DealRole.create({
      ...r,
      deal: deal.id,
      created_by: user_id,
      user: user_id
    })
  }

  deal = await promisify(Deal.get)(deal.id)
  deal = await Deal.updateTitle(deal)

  return deal
}

module.exports = {
  create
}
