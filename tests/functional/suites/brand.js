const fs = require('fs')
const path = require('path')
const brand = require('./data/brand.js')
const contexts = require('./data/context.js')
const { omit, find } = require('lodash')
const { resolve } = require('../util')

registerSuite('office', ['add'])
registerSuite('form', ['create'])
registerSuite('billing_plan', ['create'])

const sampleImage = () => fs.createReadStream(path.join(__dirname, 'data/img/sample.jpg'))

const hostname = 'testhost'
let brand_id

const createParent = (cb) => {
  brand.name = 'Parent Brand'
  brand.roles = [
    {
      role: 'Admin',
      members: [
        {
          user: results.authorize.token.data.id
        }
      ],
      acl: ['Admin']
    }
  ]

  return frisby.create('create a brand')
    .post('/brands', brand)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      // data: brand
    })
}

function attributeDefs(cb) {
  return frisby
    .create('get all global attribute defs')
    .get('/contacts/attribute_defs')
    .addHeader('X-RECHAT-BRAND', results.brand.createParent.data.id)
    .after(cb)
    .expectStatus(200)
}

const createBrandLists = cb => {
  const defs = Object.fromEntries(results.brand.attributeDefs.data.map(a => [a.name, a.id]))

  return frisby.create('create brand lists')
    .post(`/brands/${results.brand.createParent.data.id}/lists`, [{
      name: 'Warm',
      filters: [{
        attribute_def: defs.tag,
        value: 'Warm'
      }],
      touch_freq: 60
    }, {
      name: 'Hot',
      filters: [{
        attribute_def: defs.tag,
        value: 'Hot'
      }],
      touch_freq: 30
    }, {
      name: 'Past Client',
      filters: [{
        attribute_def: defs.tag,
        value: 'Past Client'
      }]
    }, {
      name: 'iOS',
      filters: [{
        attribute_def: defs.tag,
        value: 'IOSAddressBook'
      }]
    }])
    .addHeader('X-RECHAT-BRAND', results.brand.createParent.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 4)
}

const create = (cb) => {
  brand.parent = results.brand.createParent.data.id
  brand.name = 'Child Brand'

  brand.roles = [
    {
      role: 'Owner',
      members: [
        {
          user: results.authorize.token.data.id
        }
      ],
      acl: ['Admin', 'Marketing', 'Deals', 'CRM', 'Showings']
    }
  ]

  delete brand.role // We don't have a role in this one. But we should have access as we have access to the parent.

  return frisby.create('create a child brand')
    .post('/brands', brand)
    .addHeader('x-handle-jobs', 'yes')
    .after((err, res, body) => {
      brand_id = body.data.id
      cb(err, res, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const get = (cb) => {
  return frisby.create('get brand')
    .get(`/brands/${results.brand.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: results.brand.create.data
    })
}

const byParent = (cb) => {
  return frisby.create('get brands by their parent')
    .get(`/brands/${results.brand.createParent.data.id}/children`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [results.brand.create.data]
    })
}

const update = cb => {
  const updated = {...results.brand.create.data, name: 'Updated Brand'}

  return frisby.create('update brand')
    .put(`/brands/${results.brand.create.data.id}`, updated)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: updated
    })
}

const addHostname = cb => {
  return frisby.create('add hostname to a brand')
    .post(`/brands/${brand_id}/hostnames`, {
      hostname: hostname,
      is_default: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      //       data: brand
    })
}

const removeHostname = cb => {
  return frisby.create('delete hostname of a brand')
    .delete(`/brands/${brand_id}/hostnames?hostname=${hostname}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      //       data: brand
    })
}

const addDateContext = cb => {
  const list_date = {
    ...contexts.list_date,
    checklists: [
      {
        checklist: results.brand.addChecklist.data.id,
        is_required: true
      }
    ]
  }

  return frisby.create('add a context definition to a brand')
    .post(`/brands/${brand_id}/contexts?associations[]=brand_context.checklists`, list_date)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: omit(list_date, 'checklists')
    })
}

const addTextContext = cb => {
  const contract_status = {
    ...contexts.contract_status,
    checklists: [
      {
        checklist: results.brand.addChecklist.data.id,
        is_required: true
      }
    ]
  }

  return frisby.create('add a context definition to a brand')
    .post(`/brands/${brand_id}/contexts?associations[]=brand_context.checklists`, contract_status)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: omit(contract_status, 'checklists')
    })
}

const sortContexts = cb => {
  const items = [
    {
      id: results.brand.addDateContext.data.id,
      order: 2
    },

    {
      id: results.brand.addTextContext.data.id,
      order: 3
    }
  ]
  return frisby.create('sort context definitions')
    .put(`/brands/${brand_id}/contexts/sort`, items)
    .after(cb)
    .expectStatus(200)
}

const getContexts = cb => {
  return frisby.create('get brand context definitions')
    .get(`/brands/${brand_id}/contexts`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: Array.from(contexts)
    })
}

const updateContext = cb => {
  const data = {
    ...results.brand.addDateContext.data,
    label: 'Updated Context',
    checklists: [
      {
        checklist: results.brand.addChecklist.data.id,
        is_required: false
      }
    ]
  }

  return frisby.create('update a context')
    .put(`/brands/${brand_id}/contexts/${data.id}?associations[]=brand_context.property_types`, data)
    .after(cb)
    .expectStatus(200)
}

const deleteContext = cb => {
  return frisby.create('delete a context')
    .delete(`/brands/${brand_id}/contexts/${results.brand.addDateContext.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const getByHostname = (cb) => {
  return frisby.create('search for a hostname')
    .get(`/brands/search?hostname=${hostname}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      //       data: brand
    })
}

const addChecklist = cb => {
  return frisby.create('add a checklist to a brand')
    .post(`/brands/${brand_id}/checklists`, {
      title: 'Checklist 1',
      checklist_type: 'Offer',
      property_type: results.brand.addPropertyType.data.id,
      order: 2,
      is_terminatable: true,
      is_deactivatable: true,
      tab_name: 'Contract'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      //       data: brand
    })
}

const updateChecklist = cb => {
  const data = results.brand.addChecklist.data
  data.title = 'Updated Checklist'

  return frisby.create('update a checklist')
    .put(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}`, data)
    .after(cb)
    .expectStatus(200)
}

const deleteChecklist = cb => {
  const current_offer = find(results.brand.addPropertyType.data.checklists, {checklist_type: 'Offer'})
  return frisby.create('delete a checklist to a brand')
    .delete(`/brands/${brand_id}/checklists/${current_offer.id}`)
    .after(cb)
    .expectStatus(204)
}

const getChecklists = cb => {
  return frisby.create('get a brands checklists')
    .get(`/brands/${brand_id}/checklists`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      //       data: brand
    })
}

const addTask = cb => {
  const task = {
    title: 'Task 1',
    task_type: 'Form',
    form: results.form.create.data.id,
    order: 1,
    required: true
  }

  return frisby.create('add a task to a brand checklist')
    .post(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks`, task)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const updateTask = cb => {
  const d = results.brand.addTask.data
  d.title = 'Updated Task'
  d.required = false

  return frisby.create('update a task')
    .put(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks/${results.brand.addTask.data.id}`, d)
    .after(cb)
    .expectStatus(200)
}

const sortChecklist = cb => {
  const task = results.brand.addTask.data.tasks[0]

  const data = [
    {
      id: task.id,
      order: 3
    }
  ]

  return frisby.create('sort a checklist')
    .put(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/sort`, data)
    .after(cb)
    .expectStatus(200)
}

const deleteTask = cb => {
  return frisby.create('delete a task from a brand checklist')
    .delete(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks/${results.brand.addTask.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addRole = cb => {
  return frisby.create('add a role to a brand')
    .post(`/brands/${brand_id}/roles`, {
      role: 'Admin',
      acl: [
        'Deals'
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const updateRole = cb => {
  return frisby.create('update a role')
    .post(`/brands/${brand_id}/roles`, {
      role: 'Updated Role Name',
      acl: [
        'Deals',
        'admin'
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getRoles = cb => {
  return frisby.create('get all roles for a brand')
    .get(`/brands/${brand_id}/roles`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteRole = cb => {
  return frisby.create('delete a brand role')
    .delete(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addMember = (body, {
  name = 'add a user to a brand role via ' + (Object.keys(body).join('+') || 'nothing'),
  expectedStatus = 200,
  expectedLen = null,
} = {}) => {
  return cb => {
    const f = frisby.create(name)
      .post(
        `/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members`,
        resolve(body),
        { form: true, json: false },
      )
      .after(cb)

    if (expectedStatus) {
      f.expectStatus(expectedStatus)
    }

    if (expectedLen) {
      f.expectJSONLength('data', expectedLen)
    }

    return f
  }
}

const getMembers = cb => {
  return frisby.create('get all members of a brand role')
    .get(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        type: 'user'
      }]
    })
    .expectJSONLength('data', 7)
}

const deleteMember = cb => {
  return frisby.create('delete a member from a role')
    .delete(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members/${results.authorize.token.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const getAgents = cb => {
  return frisby.create('get all agents of a brand')
    .get(`/brands/${brand_id}/agents?q=User`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const addTemplate = cb => {
  const form = results.form.create.data.id
  const field = 51821682
  const value = 'Template Value'

  return frisby.create('add a form template')
    .post(`/brands/${brand_id}/forms/templates/${form}/${field}`, {value})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getTemplates = cb => {
  return frisby.create('get all templates for a brand (and its parents)')
    .get(`/brands/${brand_id}/forms/templates/${results.form.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          form: results.brand.addTemplate.data.form,
          field: results.brand.addTemplate.data.field,
          value: results.brand.addTemplate.data.value,
        }
      ],
      info: {
        count: 1
      }
    })
}

const deleteTemplate = cb => {
  const form = results.brand.addTemplate.data.form
  const field = results.brand.addTemplate.data.field

  return frisby.create('delete a template')
    .delete(`/brands/${brand_id}/forms/templates/${form}/${field}`)
    .after(cb)
    .expectStatus(204)
}

const updateMarketingPalette = cb => {
  const marketing_palette = {
    'body-bg-color': '#eee'
  }

  return frisby.create('update marketing palette')
    .put(`/brands/${brand_id}/settings/marketing_palette`, {
      value: marketing_palette
    })
    .addHeader('X-Rechat-Brand', brand_id)
    .after(cb)
    .expectJSON({
      data: {
        marketing_palette
      }
    })
    .expectStatus(200)
}

const updateBrandTheme = cb => {
  const theme = {
    palette: {
      primary: {
        main: 'rgba(191,81,81,0.87)',
        contrastText: 'rgba(191,81,81,0.87)'
      },
      secondary: {
        main: 'rgba(191,81,81,0.87)'
      }
    }
  }

  return frisby.create('update marketing palette')
    .put(`/brands/${brand_id}/settings/theme`, {
      value: theme
    })
    .addHeader('X-Rechat-Brand', brand_id)
    .after(cb)
    .expectJSON({
      data: {
        theme
      }
    })
    .expectStatus(200)
}

const updateUserSettings = cb => {
  return frisby.create('update a user setting')
    .put('/users/self/settings/user_filter', {
      value: [
        '4926132e-9e1d-11e7-8fd6-0242ac110003',
        '5d66ae5e-f82c-11e5-b4b4-f23c91b0d077'
      ]
    })
    .addHeader('X-Rechat-Brand', brand_id)
    .after(cb)
    .expectStatus(200)
}

const getUserRoles = cb => {
  return frisby.create('get all user roles')
    .get('/users/self/roles')
    .after(cb)
    .expectStatus(200)
}


const createSubscription = cb => {
  const { plan } = results.billing_plan.create

  const subscription = {
    plan: plan.id
  }

  return frisby.create('create a subscription')
    .post(`/brands/${brand_id}/subscriptions`, subscription)
    .after(cb)
    .expectStatus(200)
}


const updateSubscription = cb => {
  const created = results.brand.createSubscription.data

  const data = {
    content: {
      subscription: {
        id: created.chargebee_id
      }
    }
  }

  return frisby.create('update a subscription (webhook)')
    .post('/chargebee/webhook', data)
    .after(cb)
    .expectStatus(200)
}

const checkoutSubscription = cb => {
  const { id } = results.brand.createSubscription.data

  return frisby.create('get checkout page')
    .get(`/brands/${brand_id}/subscriptions/${id}/checkout`, {
      followRedirect: false
    })
    .after(cb)
    .expectStatus(302)
}

const cancelSubscription = cb => {
  const { id } = results.brand.createSubscription.data

  return frisby.create('cancel a subscription')
    .post(`/brands/${brand_id}/subscriptions/${id}/cancel`)
    .after(cb)
    .expectStatus(204)
}

const removeBrand = cb => {
  return frisby.create('delete a brand')
    .delete(`/brands/${brand_id}`)
    .after(cb)
    .expectStatus(204)
}

const addEmail = cb => {
  const email = {
    name: 'Email Name',
    goal: 'Email Goal',
    subject: 'Email Subject',
    body: 'Email Body',
    include_signature: true
  }

  return frisby.create('add an email template to a brand')
    .post(`/brands/${brand_id}/emails/templates`, email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: email
    })
}

const updateEmail = cb => {
  const email = {
    name: 'Updated Email Name',
    goal: 'Updated Email Goal',
    subject: 'Updated Email Subject',
    body: 'Updated Email Body',
    include_signature: false
  }

  return frisby.create('update an email template')
    .put(`/brands/${brand_id}/emails/templates/${results.brand.addEmail.data.id}`, email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: email
    })
}

const getEmails = cb => {
  return frisby.create('get email templates')
    .get(`/brands/${brand_id}/emails/templates`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.brand.updateEmail.data]
    })
}

const deleteEmail = cb => {
  return frisby.create('delete an email')
    .delete(`/brands/${brand_id}/emails/templates/${results.brand.addEmail.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addStatus = cb => {
  const status = {
    label: 'Active',
    admin_only: false,
    is_archived: true,
    checklists: [
      results.brand.addChecklist.data.id
    ]
  }

  return frisby.create('add a deal status')
    .post(`/brands/${brand_id}/deals/statuses`, status)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: omit(status, 'checklists')
    })
}

const updateStatus = cb => {
  const status = {
    label: 'Active Contingent',
    admin_only: true,
    is_archived: false,
    is_active: true,
    is_pending: false,
    checklists: [
      results.brand.addChecklist.data.id
    ]
  }

  return frisby.create('update a deal status')
    .put(`/brands/${brand_id}/deals/statuses/${results.brand.addStatus.data.id}`, status)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: omit(status, 'checklists')
    })
}

const getStatuses = cb => {
  return frisby.create('get deal statuses')
    .get(`/brands/${brand_id}/deals/statuses`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.brand.updateStatus.data]
    })
}

const deleteStatus = cb => {
  return frisby.create('delete a deal status')
    .delete(`/brands/${brand_id}/deals/statuses/${results.brand.addStatus.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addPropertyType = cb => {
  const property_type = {
    label: 'Residential Lease',
    is_lease: true,
    required_roles: ['Tenant', 'Landlord'],
    optional_roles: ['Title']
  }

  return frisby.create('add a property type')
    .post(`/brands/${brand_id}/deals/property_types`, property_type)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        ...property_type,
        required_roles: [
          { role: 'Tenant' },
          { role: 'Landlord' }
        ],
        optional_roles: [
          { role: 'Title' },
        ]
      }
    })
}

const updatePropertyType = cb => {
  const property_type = {
    ...results.brand.addPropertyType.data,
    label: 'Residential',
    is_lease: false,
    required_roles: ['Buyer', 'Seller'],
    optional_roles: ['BuyerAgent']
  }

  return frisby.create('update a property type')
    .put(`/brands/${brand_id}/deals/property_types/${property_type.id}`, property_type)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        ...property_type,
        required_roles: [
          { role: 'Buyer' },
          { role: 'Seller' }
        ],
        optional_roles: [
          { role: 'BuyerAgent' },
        ]
      }
    })
}

const sortPropertyType = cb => {
  const items = [
    {
      id: results.brand.addPropertyType.data.id,
      order: 1
    }
  ]

  return frisby.create('sort property types')
    .put(`/brands/${brand_id}/deals/property_types/sort`, items)
    .after(cb)
    .expectStatus(200)
}

const getPropertyTypes = cb => {
  return frisby.create('get property types')
    .get(`/brands/${brand_id}/deals/property_types?associaions[]=brand_property_type.checklists`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        omit({
          ...results.brand.updatePropertyType.data,
          order: 1 // Updated on previous test from 0 to 1
        }, 'checklists')
      ]
    })
}

const deletePropertyType = cb => {
  const id = results.brand.addPropertyType.data.id
  return frisby.create('delete a property type')
    .delete(`/brands/${brand_id}/deals/property_types/${id}`)
    .after(cb)
    .expectStatus(204)
}

function createAsset(cb) {
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('create an asset')
    .post(
      '/brands/assets',
      {
        file: logo,
        label: 'Asset Label',
        template_type: 'Christmas',
        medium: 'Email',
        brands: [results.brand.create.data.id].join(',') // You can provide a comma-separated list of brand ids.
      },
      {
        json: false,
        form: true
      }
    )
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const getAssetCategoriesForBrand = cb => {
  return frisby.create('get categories for a user')
    .get(`/brands/${results.brand.create.data.id}/templates/categories?filter=asset`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        Christmas: [
          'Email'
        ]
      }
    })
}

const getAssets = cb => {
  return frisby.create('get brand assets')
    .get(`/brands/${brand_id}/assets`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.brand.createAsset.data]
    })
}

function shareAsset(cb) {
  const text = 'Please share this'

  const data = {
    text,
    recipients: [
      '+14243828604'
    ]
  }

  const asset = JSON.parse(results.brand.createAsset).data[0]

  return frisby
    .create('share an asset with text')
    .post(`/brands/${results.brand.create.data.id}/assets/${asset.id}/share`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteAsset = cb => {
  return frisby.create('delete a brand asset')
    .delete(`/brands/${brand_id}/assets/${results.brand.getAssets.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

function createWebhook(cb) {
  return frisby
    .create('create a webhook')
    .post(`/brands/${results.brand.create.data.id}/webhooks`, {
      topic: 'Showings',
      url: 'https://localhost:3000'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

module.exports = {
  createParent,
  attributeDefs,
  createBrandLists,
  create,

  get,
  byParent,
  update,

  addRole,
  updateRole,
  getRoles,

  addNewMemberWithEmail: addMember({
    email: 'invited-member+email1@rechat.co',
    first_name: 'AAA',
  }, {
    name: 'create a member with email',
  }),

  addNewMemberWithEmailAndAvatar: addMember({
    email: 'invited-member+email2@rechat.co',
    avatar: sampleImage(),
  }, {
    name: 'create a member with email+avatar',
  }),

  addNewMemberWithPhone: addMember({
    phone_number: '+14099990001',
    last_name: 'BBB',
  }, {
    name: 'create a member with phone',
  }),

  addNewMemberWithPhoneAndAvatar: addMember({
    phone_number: '+14099990002',
    avatar: sampleImage(),
  }, {
    name: 'create a member with phone+avatar',
  }),

  addMemberWithUser: addMember({
    user: () => results.authorize.token.data.id,
    // when user is provided, all other fields will be ignored:
    last_name: 'CCC',
    email: 'invited-member+email2@rechat.co',
    phone_number: '+14099990001',
  }, {
    name: 'add an existing user as member',
  }),

  addNewMemberMixed: addMember({
    email: 'invited-member+email3@rechat.co',
    phone_number: '+14099990003',
    first_name: 'DDD',
    last_name: 'EEE',
  }, {
    name: 'add a new member with email+phone',
  }),

  addNewMemberMixedWithAvatar: addMember({
    email: 'invited-member+email4@rechat.co',
    phone_number: '+14099990004',
    first_name: 'FFF',
    last_name: 'GGG',
  }, {
    name: 'add a new member with email+phone+avatar',
  }),

  addMemberWithEmailAndPhone: addMember({
    email: 'invited-member+email4@rechat.co',
    phone_number: '+14099990004',
  }, {
    name: 'add an existing user using email+phone',
  }),

  tryToAddConflictingMember: addMember({
    phone_number: '+14099990002',
    email: 'invited-member+email4@rechat.co',
  }, {
    name: 'try to add a member using conflicting phone and email (409)',
    expectedStatus: 409,
  }),

  tryToAddMemberWithEmailAndAvatar: addMember({
    email: 'invited-member+email3@rechat.co',
    avatar: sampleImage(),
  }, {
    name: 'try to add an existing member using email and update its avatar (400)',
    expectedStatus: 400,
  }),

  tryToAddMemberWithPhoneAndAvatar: addMember({
    phone_number: '+14099990004',
    avatar: sampleImage(),
  }, {
    name: 'try to add an existing member using phone and update its avatar (400)',
    expectedStatus: 400,
  }),

  tryToAddMemberWithUserAndAvatar: addMember({
    user: () => results.authorize.token.data.id,
    avatar: sampleImage(),
  }, {
    name: 'try to add an existing member using user id and update its avatar (400)',
    expectedStatus: 400,
  }),

  getMembers,

  getAgents,

  deleteMember,

  deleteRole,

  addHostname,
  addPropertyType,
  updatePropertyType,
  sortPropertyType,

  deleteChecklist,
  addChecklist,
  updateChecklist,
  addTask,
  updateTask,
  sortChecklist,
  getChecklists,
  getPropertyTypes,
  deletePropertyType,
  deleteTask,
  getByHostname,
  removeHostname,

  addDateContext,
  addTextContext,
  sortContexts,
  getContexts,
  updateContext,
  deleteContext,

  addTemplate,
  getTemplates,
  deleteTemplate,

  addEmail,
  updateEmail,
  getEmails,
  deleteEmail,

  updateMarketingPalette,
  updateBrandTheme,
  updateUserSettings,

  createSubscription,
  updateSubscription,
  checkoutSubscription,
  cancelSubscription,

  getUserRoles,

  addStatus,
  updateStatus,
  getStatuses,
  deleteStatus,

  createAsset,
  getAssetCategoriesForBrand,
  getAssets,
  shareAsset,
  deleteAsset,

  createWebhook,

  removeBrand
}
