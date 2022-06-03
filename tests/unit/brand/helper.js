const _ = require('lodash')

const checklists = require('./checklists')
const contexts = require('./contexts')
const property_types = require('./property_types')

const Brand = require('../../../lib/models/Brand')

const BrandRole = {
  ...require('../../../lib/models/Brand/role/get'),
  ...require('../../../lib/models/Brand/role/save'),
  ...require('../../../lib/models/Brand/role/members')
}

const BrandContext = require('../../../lib/models/Brand/deal/context')
const BrandPropertyType = {
  ...require('../../../lib/models/Brand/deal/property_type/save'),
  ...require('../../../lib/models/Brand/deal/property_type/get')
}
const BrandChecklist = require('../../../lib/models/Brand/deal/checklist')
const BrandEmail = require('../../../lib/models/Brand/email/save')
const BrandFlow = require('../../../lib/models/Brand/flow/create')
const BrandList = require('../../../lib/models/Brand/list')
const Context = require('../../../lib/models/Context')
const Form = require('../../../lib/models/Form')
const Tag = require('../../../lib/models/Contact/tag')
const User = require('../../../lib/models/User/get')
const Template = require('../../../lib/models/Template/create')
const { isUUID } = require('../../../lib/utils/validator')

const UserHelper = require('../user/helper')

const default_data = {
  name: 'Test Brand',
  brand_type: Brand.BROKERAGE,

  roles: {
    Admin: []
  },

  contexts,
  checklists,
  property_types,
}

async function create(data) {
  const original_log_setting = Context.get('db:log')
  Context.set({'db:log': false})

  data = Object.assign({}, default_data, data)

  const {
    roles,
    contexts,
    checklists,
    property_types,
    emails,
    flows,
    lists,
    templates,
    tags,
    children,
    ...brand_props
  } = data

  const b = await Brand.create(brand_props)

  for (const r in roles) {
    let role, members

    if (Array.isArray(roles[r])) {
      role = await BrandRole.create({
        brand: b.id,
        role: r,
        acl: ['Admin']
      })
      members = roles[r]
    } else {
      role = await BrandRole.create({
        brand: b.id,
        role: r,
        acl: roles[r].acl
      })
      members = roles[r].members
    }

    for (const m of members) {
      if (isUUID(m)) {
        await BrandRole.addMember({
          user: m,
          role: role.id
        })
      } else {
        const user = await User.getByEmail(m)
        if (!user) continue

        await BrandRole.addMember({
          user: user.id,
          role: role.id
        })
      }
    }
  }

  if (Array.isArray(children)) {
    for (const childBrand of children) {
      await create({
        ...childBrand,
        parent: b.id
      })
    }
  }

  const property_types_by_label = {}
  for (const { label, is_lease } of property_types) {
    const property_type = await BrandPropertyType.create({
      label,
      is_lease,
      brand: b.id,
    })

    /*
     * The BrandPropertyType.create() function automatically created 3 checklists as a convenience.
     * But during tests they are not needed as we'll create our own checklists.
     * Having both will create issues.
     * So, we just delete the ones created automatically and create new ones instead
     */
    await Promise.all(property_type.checklists.map(BrandChecklist.delete))

    property_types_by_label[label] = property_type.id
  }

  const form = await Form.create({
    name: 'Test Form'
  })

  const saved_checklists = []
  for(const { property_type, ...checklist } of checklists) {
    const saved = await BrandChecklist.create({
      ...checklist,
      brand: b.id,
      property_type: property_types_by_label[property_type]
    })
    saved_checklists.push(saved)

    const { tasks } = checklist

    for(const task of tasks) {
      await BrandChecklist.addTask({
        ...task,
        checklist: saved.id,
        form: form.id
      })
    }
  }

  for(const key in contexts) {
    await BrandContext.create({
      ...contexts[key],
      key,
      brand: b.id,
      checklists: saved_checklists.map(c => {
        return {
          checklist: c.id,
          is_required: true
        }
      })
    })
  }

  if (Array.isArray(emails)) {
    for (const email of emails) {
      await BrandEmail.create({
        created_by: email.created_by,
        brand: b.id,
        name: email.name,
        goal: email.goal,
        subject: email.subject,
        include_signature: email.include_signature,
        body: email.body,
      })
    }
  }

  if (Array.isArray(flows)) {
    for (const flow of flows) {
      for (const step of flow.steps) {
        if (typeof step.email === 'object') {
          const email = await BrandEmail.create({
            created_by: flow.created_by,
            brand: b.id,
            name: step.email.name,
            goal: step.email.goal,
            subject: step.email.subject,
            include_signature: step.email.include_signature,
            event_type: 'last_step_date',
            body: step.email.body,
          })

          step.email = email.id
        }
      }

      await BrandFlow.create(b.id, flow.created_by, flow)
    }
  }

  if (Array.isArray(templates)) {
    for (const template of templates) {
      await Template.create({ ...template, brands: [b.id] })
    }
  }

  if (Array.isArray(lists)) {
    await BrandList.createAll(b.id, lists)
  }

  if (Array.isArray(tags)) {
    const testUser = await UserHelper.TestUser()
    await Promise.all(tags.map(t => Tag.create(b.id, testUser.id, t, null)))
  }

  Context.set({'db:log': original_log_setting})

  return Brand.get(b.id)
}

async function getContexts(brand_id) {
  const bc = await BrandContext.getByBrand(brand_id)

  return _.keyBy(bc, 'key')
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<any[]>}
 */
function getChecklists(ids) {
  return BrandChecklist.getAll(ids)
}

async function getPropertyTypes(brand_id) {
  const property_types = await BrandPropertyType.getByBrand(brand_id)
  return _.keyBy(property_types, 'label')
}

async function removeMember(brand, user) {
  const roles = await BrandRole.getByUser(brand, user)
  for (const role of roles) {
    await BrandRole.removeMember(role, user)
  }
}

module.exports = {
  create,
  getContexts,
  getChecklists,
  getPropertyTypes,
  removeMember
}
