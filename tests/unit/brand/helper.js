const _ = require('lodash')

const checklists = require('./checklists')
const contexts = require('./contexts')

const Brand = require('../../../lib/models/Brand')
const BrandRole = require('../../../lib/models/Brand/role')
const BrandContext = require('../../../lib/models/Brand/context')
const BrandChecklist = require('../../../lib/models/Brand/checklist')
const Context = require('../../../lib/models/Context')

const default_data = {
  name: 'Test Brand',
  brand_type: Brand.BROKERAGE,

  roles: {
    Admin: []
  },

  contexts,
  checklists
}

async function create(data) {
  const original_log_setting = Context.get('db:log')
  Context.set({'db:log': false})

  data = Object.assign({}, default_data, data)

  const { roles, contexts, checklists, ...brand_props } = data

  const b = await Brand.create(brand_props)

  for (const r in roles) {
    const role = await BrandRole.create({
      brand: b.id,
      role: r,
      acl: ['*']
    })

    for (const m of roles[r]) {
      await BrandRole.addMember({
        user: m,
        role: role.id
      })
    }
  }

  for(const checklist of checklists) {
    const saved = await BrandChecklist.create({
      ...checklist,
      brand: b.id
    })

    const { tasks } = checklist

    for(const task of tasks) {
      await BrandChecklist.addTask({
        ...task,
        checklist: saved.id
      })
    }
  }

  for(const key in contexts) {
    await BrandContext.create({
      ...contexts[key],
      key,
      brand: b.id
    })
  }

  Context.set({'db:log': original_log_setting})

  return Brand.get(b.id)
}

async function getContexts(brand_id) {
  const bc = await BrandContext.getByBrand(brand_id)

  return _.keyBy(bc, 'key')
}

/**
 * @param {UUID} brand_id
 * @returns {Promise<any[]>}
 */
function getChecklists(brand_id) {
  return BrandChecklist.getByBrand(brand_id)
}

module.exports = {
  create,
  getContexts,
  getChecklists
}