const _ = require('lodash')

const Brand = require('../../../lib/models/Brand')
const Role = require('../../../lib/models/Brand/role')
const Context = require('../../../lib/models/Brand/context')
const Checklist = require('../../../lib/models/Brand/checklist')

const default_data = {
  name: 'Test Brand',

  roles: {
    Admin: []
  },

  contexts: {
    closing_date: {
      data_type: 'Date',
      label: 'Closing Date',
      short_label: 'Cls',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'Provided',
      triggers_brokerwolf: false
    },
    contract_date: {
      data_type: 'Date',
      label: 'Contract Date',
      short_label: 'Off',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'Provided',
      triggers_brokerwolf: false
    },
    expiration_date: {
      data_type: 'Date',
      label: 'Listing Expiration',
      short_label: 'Exp',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'Provided',
      triggers_brokerwolf: false
    },
    full_address: {
      data_type: 'Text',
      label: 'Full Address',
      short_label: 'Cls',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'MLS',
      triggers_brokerwolf: false
    },
    street_address: {
      data_type: 'Text',
      label: 'Street Address',
      short_label: 'Cls',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'MLS',
      triggers_brokerwolf: false
    },
    photo: {
      data_type: 'Text',
      label: 'Photo',
      short_label: 'Cls',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'MLS',
      triggers_brokerwolf: false
    },
    list_price: {
      data_type: 'Number',
      label: 'List Price',
      short_label: 'Cls',
      order: 0,
      section: 'Dates',
      needs_approval: true,
      exports: true,
      preffered_source: 'MLS',
      triggers_brokerwolf: false
    },
  },

  checklists: [{
    title: 'Buying - Resale',
    deal_type: 'Buying',
    property_type: 'Resale',
    order: 1,
    is_deactivatable: false,
    is_terminatable: false,
    tab_name: 'Contract Inbox',
  }]
}

async function createBrand(data) {
  data = Object.assign({}, default_data, data)

  const { roles, contexts, checklists, ...brand_props } = data

  const b = await Brand.create(brand_props)

  for (const r in roles) {
    const role = await Role.create({
      brand: b.id,
      role: r,
      acl: ['*']
    })

    for (const m of roles[r]) {
      await Role.addMember({
        user: m,
        role: role.id
      })
    }
  }

  for (const c of checklists) {
    Checklist.create({
      ...c,
      brand: b.id
    })
  }

  for (const c in contexts) {
    await Context.create({
      ...contexts[c],
      key: c,
      brand: b.id
    })
  }

  return Brand.get(b.id)
}

async function getBrandContexts(brand_id) {
  const bc = await BrandContext.getByBrand(brand_id)

  return _.keyBy(bc, 'key')
}

function getBrandChecklists(brand_id) {
  return Checklist.getByBrand(brand_id)
}

module.exports = {
  createBrand,
  getBrandContexts,
  getBrandChecklists
}
