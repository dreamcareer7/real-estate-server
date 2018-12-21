const {deal} = require('./data/deal.js')
const deal_response = require('./expected_objects/deal.js')
const omit = require('lodash/omit')
const schemas = require('./schemas/deal')

registerSuite('listing', ['getListing'])
registerSuite('brokerwolf', [
  'saveSettings',
  'syncMembers',
  'syncClassifications',
  'mapClassification',
  'syncPropertyTypes',
  'mapPropertyType',
  'syncContactTypes',
  'mapContactType'
])
registerSuite('brand', ['addChecklist', 'addForm', 'addTask', 'addAnotherTask'])
registerSuite('user', ['upgradeToAgentWithEmail'])

const pdf = 'https://s3-us-west-2.amazonaws.com/rechat-forms/2672324.pdf'

const getContexts = cb => {
  return frisby.create('get all possible context items')
    .get('/deals/contexts')
    .after(cb)
    .expectStatus(200)
    .expectJSONSchema(schemas.getContexts)
}

const create = (cb) => {
  const data = JSON.parse(JSON.stringify(deal))
  data.listing = results.listing.getListing.data.id

  return frisby.create('create a deal')
    .post('/deals', data)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: data
    })
}

const patchListing = cb => {
  const patch = {
    listing: results.listing.getListing.data.id,
  }
  const expected_object = Object.assign({}, results.deal.create.data, patch)

  return frisby.create('set a listing for a deal')
    .patch(`/deals/${results.deal.create.data.id}/listing`, patch)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: expected_object
    })
}

const patchDraft = cb => {
  const patch = {
    is_draft: false
  }

  results.deal.create.data.is_draft = false
  delete results.deal.create.data.faired_at

  const expected_object = Object.assign({}, results.deal.create.data, patch)

  return frisby.create('publish a deal to live mode')
    .patch(`/deals/${results.deal.create.data.id}/draft`, patch)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: expected_object
    })
}

const addContext = cb => {
  const checklist = results.deal.addChecklist.data.id

  const context = {
    listing_status: {
      value: 'Active',
      checklist
    },
    year_built: {
      value: 1972,
      checklist
    },
    contract_date: {
      value: '1979/12/01',
      checklist
    },
    closing_date: {
      value: '1980/01/01',
      checklist
    },
    list_date: {
      value: '2017/12/06',
      checklist
    },
    sales_price: {
      value: 999999,
      checklist
    },
    commission_listing: {
      value: 3,
      checklist
    },
    commission_selling: {
      value: 3,
      checklist
    },
    unit_number: {
      value: '3A',
      checklist
    }
  }

  const expected_object = Object.assign({}, omit(results.deal.create.data, [
    'brokerwolf_tier_id',
    'brokerwolf_id',
    'brokerwolf_row_version',
    'email'
  ]), {
    deal_context: {
      list_date: {
        context_type: 'Date',
        date: (new Date('2017/12/06')).valueOf() / 1000
      }
    }
  })

  return frisby.create('add some context to a deal')
    .post(`/deals/${results.deal.create.data.id}/context`, { context })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: expected_object
    })
    .expectJSONSchema(schemas.addContext)
}

const approveContext = cb => {
  const cid = results.deal.addContext.data.deal_context.listing_status.id

  delete results.deal.addContext.data.deal_context.listing_status

  return frisby.create('approve a context item')
    .patch(`/deals/${results.deal.create.data.id}/context/${cid}/approved`, {approved: true})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.addContext.data
    })
    .expectJSONSchema(schemas.approveContext)
}

const addRole = cb => {
  const roles = [
    {
      email: 'test@rechat.com',
      role: 'BuyerAgent',
      commission_percentage: 3,
      company_title: 'ACME',
      legal_first_name: 'Wile',
      legal_middle_name: 'E.',
      legal_last_name: 'Coyote',
    },

    {
      legal_first_name: 'Imaginary',
      legal_last_name: 'Agent',
      email: 'test@rechat.com',
      role: 'SellerAgent',
      commission_dollar: 20000
    }
  ]

  results.deal.create.data.roles = roles.map(role => ({
    ...omit(role, 'email'),
    user: {
      email: role.email
    }
  }))

  return frisby.create('add a role to a deal')
    .post(`/deals/${results.deal.create.data.id}/roles`, { roles })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
    .expectJSONTypes({
      code: String,
    })
}

const updateRole = cb => {
  const name = 'Updated Legal Name'

  results.deal.create.data.roles[0].legal_first_name = name
  return frisby.create('update a role')
    .put(`/deals/${results.deal.create.data.id}/roles/${results.deal.addRole.data[0].id}`, {
      legal_first_name: name
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.create.data.roles[0]
    })
}

const getAll = (cb) => {
  return frisby.create('get user\'s deals')
    .get('/deals')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        results.deal.approveContext.data
      ]
    })
}


const get = (cb) => {
  return frisby.create('get a deal')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.approveContext.data
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const addChecklist = cb => {
  const checklist = {
    title: 'Offered Checklist',
    order: 1,
    is_deactivated: true
  }

  return frisby.create('add a checklist')
    .post(`/deals/${results.deal.create.data.id}/checklists`, {
      checklist,

      conditions: {
        deal_type: results.brand.addChecklist.data.deal_type,
        property_type: results.brand.addChecklist.data.property_type,
      }
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...checklist,
        is_terminated: false
      }
    })
    .expectJSONSchema(schemas.offerChecklist)
}

const updateChecklist = cb => {
  return frisby.create('updated a checklist')
    .put(`/deals/${results.deal.create.data.id}/checklists/${results.deal.addChecklist.data.id}`, {
      title: 'Updated Checklist 1',
      order: 3,
      is_deactivated: true,
      is_terminated: true
    })
    .after(cb)
    .expectStatus(200)
}

const removeRole = (cb) => {
  return frisby.create('delete a role')
    .delete(`/deals/${results.deal.create.data.id}/roles/${results.deal.addRole.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

const remove = (cb) => {
  return frisby.create('delete a deal')
    .delete(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addTask = cb => {
  const task = {
    title: 'Test Title',
    status: 'New',
    task_type: 'Form',
    form: results.form.create.data.id,
    checklist: results.deal.addChecklist.data.id,
    is_deletable: true
  }

  return frisby.create('add a task to a deal')
    .post(`/deals/${results.deal.create.data.id}/tasks`, task)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      //       code: 'OK',
      //       data: results.deal.create.data
    })
    .expectJSONTypes({
      //       code: String,
      //       data: deal_response
    })
}

const addAnotherTask = cb => {
  const anotherTask = {
    title: 'Another Task',
    status: 'New',
    task_type: 'Form',
    form: results.form.create.data.id,
    checklist: results.deal.addChecklist.data.id
  }
  
  return frisby.create('add another task to a deal')
    .post(`/deals/${results.deal.create.data.id}/tasks`, anotherTask)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      data: {
        id: String
      }
    })
}

const updateTask = cb => {
  const props = {
    title: 'Another Task for Gholi'
  }

  return frisby.create('edit another task\'s title')
    .patch(`/tasks/${results.deal.addAnotherTask.data.id}`, props)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        title: 'Another Task for Gholi'
      }
    })
}

const updateTasks = cb => {
  const tasks = [{
    id: results.deal.addTask.data.id,
    title: 'Bulk Test Title'
  }, {
    id: results.deal.addAnotherTask.data.id,
    attention_requested: true
  }]

  return frisby.create('bulk edit tasks of a deal')
    .put(`/deals/${results.deal.create.data.id}/tasks`, tasks)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: tasks
    })
}

const removeTask = cb => {
  return frisby.create('delete another task')
    .delete(`/tasks/${results.deal.addAnotherTask.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const makeSureAnotherTaskIsDeleted = cb => {
  return frisby.create('make sure another task is deleted')
    .get(`/tasks/${results.deal.addAnotherTask.data.id}`)
    .after(cb)
    .expectJSONTypes({
      data: {
        deleted_at: String
      }
    })
}

const makeSureAnotherTaskIsntReturnedInDealContext = cb => {
  return frisby.create('make sure deleted tasks do not appear in deal context')
    .get(`/deals/${results.deal.create.data.id}?associations=deal.checklists`)
    .after(cb)
    .expectStatus(200)
    .expectJSONSchema(schemas.makeSureAnotherTaskIsntReturnedInDealContext)
}

const setSubmission = cb => {
  const submission = {
    form: results.form.create.data.id,
    state: 'Fair',
    pdf,
    values: {
      Form1: '11112 New Orleans Drive'
    }
  }

  return frisby.create('set submission for a deal')
    .put(`/tasks/${results.deal.addTask.data.id}/submission`, submission)
    .after(cb)
}

const updateSubmission = cb => {
  const submission = {
    form: results.form.create.data.id,
    state: 'Fair',
    pdf,
    values: {
      Form1: 'Updated 11112 New Orleans Drive'
    }
  }

  return frisby.create('update submission for a deal')
    .put(`/tasks/${results.deal.addTask.data.id}/submission`, submission)
    .after(cb)
}

const getContextHistory = cb => {
  return frisby.create('get context history on a deal')
    .get(`/deals/${results.deal.create.data.id}/context/year_built`)
    .after(cb)
}

const addActivity = cb => {
  const activity = {
    action: 'UserViewedFile',
    object_class: 'file',
    object: results.deal.setSubmission.data.file.id
  }

  return frisby.create('add an activity to a task')
    .post(`/tasks/${results.deal.addTask.data.id}/timeline`, activity)
    .expectStatus(200)
    .after(cb)
}

const getRevision = cb => {
  return frisby.create('get revision data for a submission')
    .get(`/tasks/${results.deal.addTask.data.id}/submission/${results.deal.setSubmission.data.last_revision}`)
    .after(cb)
//     .expectStatus(200)
//     .expectJSON({
//       code: 'OK',
//       data: results.deal.create.data
//     })
//     .expectJSONTypes({
//       code: String,
//       data: deal_response
//     })
}

const setReview = cb => {
  return frisby.create('Submit a review request')
    .put(`/tasks/${results.deal.addTask.data.id}/review`, {
      status: 'Declined'
    })
    .after(cb)
//     .expectStatus(200)
//     .expectJSON({
//       code: 'OK',
//       data: results.deal.create.data
//     })
//     .expectJSONTypes({
//       code: String,
//       data: deal_response
//     })
}

const sendNotifications = (cb) => {
  return frisby.create('Send Task Review Notifications')
    .post('/jobs', {
      name: 'Task.sendNotifications',
      data: {}
    })
    .after(cb)
    .expectStatus(200)
}

const patchAttention = cb => {
  return frisby.create('Change the attention state of a task')
    .patch(`/tasks/${results.deal.addTask.data.id}/attention_requested`, {
      attention_requested: true
    })
    .after(cb)
//     .expectStatus(200)
//     .expectJSON({
//       code: 'OK',
//       data: results.deal.create.data
//     })
//     .expectJSONTypes({
//       code: String,
//       data: deal_response
//     })
}

const postMessage = cb => {
  const message = {
    comment: 'Comment'
  }

  return frisby.create('Post a message to the task room')
    .post(`/tasks/${results.deal.addTask.data.id}/messages`, message)
    .after(cb)
    .expectStatus(200)
}

const getTask = cb => {
  return frisby.create('get a task')
    .get(`/tasks/${results.deal.addTask.data.id}`)
    .after(cb)
}

const getBrandDeals = (cb) => {
  return frisby.create('get brand deals')
    .get(`/brands/${results.brand.create.data.id}/deals`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getBrandXls = (cb) => {
  return frisby.create('get brand deals in excel')
    .get(`/brands/${results.brand.create.data.id}/deals.xlsx`)
    .after(cb)
    .expectStatus(200)
}

const getBrandInbox = (cb) => {
  return frisby.create('get brand inbox')
    .get(`/brands/${results.brand.create.data.id}/deals/inbox`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const filter = (cb) => {
  return frisby.create('search for a deal')
    .post('/deals/filter', {
      query: 'Imaginary'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 1
      }
    })
}

module.exports = {
  getContexts,
  create,
  addChecklist,
  patchListing,
  patchDraft,
  addRole,
  updateRole,
  addContext,
  approveContext,
  get,
  getAll,
  updateChecklist,
  addTask,
  addAnotherTask,
  updateTask,
  updateTasks,
  removeTask,
  makeSureAnotherTaskIsDeleted,
  makeSureAnotherTaskIsntReturnedInDealContext,
  setSubmission,
  updateSubmission,
  getContextHistory,
  addActivity,
  getRevision,
  getTask,
  setReview,
  sendNotifications,
  patchAttention,
  postMessage,
  getBrandInbox,
  getBrandDeals,
  getBrandXls,
  filter,
  removeRole,
  remove
}
