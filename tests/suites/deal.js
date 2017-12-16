const {deal, full_address} = require('./data/deal.js')
const deal_response = require('./expected_objects/deal.js')

registerSuite('listing', ['getListing'])
registerSuite('brand', ['createParent', 'create', 'addChecklist', 'addForm', 'addTask', 'addAnotherTask'])
registerSuite('brokerwolf', [
  'syncMembers',
  'syncClassifications',
  'mapClassification',
  'syncPropertyTypes',
  'mapPropertyType',
  'syncContactTypes',
  'mapContactType'
])
registerSuite('user', ['upgradeToAgentWithEmail'])

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
//       data: deal
    })
    .expectJSONTypes({
//       code: String,
//       data: deal_response
    })
}

const createHippocket = cb => {
  const data = JSON.parse(JSON.stringify(deal))
  data.deal_context = {full_address}

  data.roles = [
    {
      legal_first_name: 'Hippocket',
      legal_last_name: 'Seller',
      email: 'hippocket+seller@rechat.com',
      role: 'Seller'
    },

    {
      legal_first_name: 'Hippocket',
      email: 'hippocket+agent@rechat.com',
      legal_last_name: 'Hip Agent',
      role: 'SellerAgent'
    },

    {
      legal_first_name: 'Hippocket',
      email: 'hippocket+agent@rechat.com',
      legal_last_name: 'Hip Agent',
      role: 'BuyerAgent'
    },
  ]

  return frisby.create('create a hippocket deal')
    .post('/deals', data)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: {
//         deal_context: address
//       }
    })
    .expectJSONTypes({
//       code: String,
//       data: deal_response
    })
}

const patchListing = cb => {
  return frisby.create('set a listing for a deal')
    .patch(`/deals/${results.deal.create.data.id}/listing`, {
      listing: results.listing.getListing.data.id
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const addContext = cb => {
  const context = {
    listing_status: 'Active',
    year_built: 1972,
    contract_date: '1979/12/01',
    closing_date: '1980/01/01',
    list_date: '2017/12/06',
    sales_price: 999999,
    commission_listing: 3,
    commission_selling: 3,
    unit_number: '3A'
  }

  return frisby.create('add some context to a deal')
    .post(`/deals/${results.deal.create.data.id}/context`, { context })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: Object.assign({}, results.deal.create.data, {
        brokerwolf_tier_id: undefined,
        brokerwolf_id: undefined,
        brokerwolf_row_version: undefined,
        deal_context: {
          list_date: {
            context_type: 'Date',
            date: (new Date('2017/12/06')).valueOf() / 1000
          }
        }
      })
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
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
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
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

  results.deal.create.data.roles = [
    {
      type: 'deal_role',
      role: roles[0].role,
      commission_percentage: roles[0].commission_percentage,
      company_title: 'ACME',
      legal_first_name: 'Wile',
      legal_middle_name: 'E.',
      legal_last_name: 'Coyote',
      user: {
        email: roles[0].email
      }
    },

    {
      type: 'deal_role',
      role: roles[1].role,
      legal_first_name: 'Imaginary',
      legal_last_name: 'Agent',
      commission_dollar: roles[1].commission_dollar,
      user: {
        email: roles[1].email
      }
    }
  ]

  return frisby.create('add a role to a deal')
    .post(`/deals/${results.deal.create.data.id}/roles`, { roles })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: results.deal.create.data
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const getAll = (cb) => {
  return frisby.create('get user\'s deals')
    .get('/deals')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.deal.createHippocket.data, results.deal.approveContext.data]
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

const offerChecklist = cb => {
  return frisby.create('offer a checklist')
    .post(`/deals/${results.deal.create.data.id}/checklists/offer`, {
      checklist: {
        title: 'Offered Checklist',
        order: 1,
        is_deactivated: true
      },

      conditions: {
        deal_type: results.brand.addChecklist.data.deal_type,
        property_type: results.brand.addChecklist.data.property_type,
      }
    })
    .after(cb)
    .expectStatus(200)
}

const addChecklist = cb => {
  return frisby.create('add a checklist')
    .post(`/deals/${results.deal.create.data.id}/checklists`, {
      title: 'Checklist 1',
      order: 1
    })
    .after(cb)
    .expectStatus(200)
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
    .delete(`/deals/${results.deal.create.data.id}/roles/${results.deal.addRole.data.roles[0].id}`)
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
    checklist: results.deal.addChecklist.data.id
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
    needs_attention: true
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
  process.env.DEBUG = 'rechat:db:inspect,rechat:db:profile'
  return frisby.create('make sure deleted tasks do not appear in deal context')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONSchema({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      required: ['data'],
      type: 'object',
      properties: {
        data: {
          required: ['checklists'],
          properties: {
            checklists: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tasks: {
                    type: 'array',
                    items: {
                      properties: {
                        deleted_at: {
                          type: 'null'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
}

const setSubmission = cb => {
  const submission = {
    form: results.form.create.data.id,
    state: 'Fair',
    values: {
      51821682: '11112 New Orleans Drive'
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
    values: {
      51821682: 'Updated 11112 New Orleans Drive'
    }
  }

  return frisby.create('update submission for a deal')
    .put(`/tasks/${results.deal.addTask.data.id}/submission`, submission)
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
      status: 'Submitted'
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

const patchAttention = cb => {
  return frisby.create('Change the attention state of a task')
    .patch(`/tasks/${results.deal.addTask.data.id}/needs_attention`, {
      needs_attention: true
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

const getTask = cb => {
  return frisby.create('get a task')
    .get(`/tasks/${results.deal.addTask.data.id}`)
    .after(cb)
}

const getBrandDeals = (cb) => {
  return frisby.create('get brand inbox')
    .get(`/brands/${results.brand.create.data.id}/deals`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
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
  create,
  createHippocket,
  patchListing,
  addRole,
  addContext,
  approveContext,
  get,
  getAll,
  addChecklist,
  offerChecklist,
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
  addActivity,
  getRevision,
  getTask,
  setReview,
  patchAttention,
  getBrandInbox,
  getBrandDeals,
  filter,
  removeRole,
  remove
}
