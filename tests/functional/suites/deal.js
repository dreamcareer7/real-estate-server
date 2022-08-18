const {deal} = require('./data/deal.js')
const deal_response = require('./expected_objects/deal.js')
const omit = require('lodash/omit')
const schemas = require('./schemas/deal')
const fs = require('fs')
const path = require('path')
const moment = require('moment-timezone')

const config = require('../../../lib/config')
const Crypto = require('../../../lib/models/Crypto')

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
registerSuite('brand', [
  'deleteChecklist',
  'addChecklist',
  'addDateContext',
  'addTextContext',
  'addForm',
  'addTemplate',
  'addTask',
  'addAnotherTask',
  'addPropertyType'
])
registerSuite('user', ['upgradeToAgentWithEmail'])

const pdf = 'https://s3-us-west-2.amazonaws.com/rechat-forms/2672324.pdf'

const getRoleDefinitions = (cb) => {
  return frisby.create('get role definitions')
    .get('/deals/roles/definitions')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
    })
}

const create = (cb) => {
  const data = {
    ...JSON.parse(JSON.stringify(deal)),
    property_type: results.brand.addPropertyType.data.id
  }

  return frisby.create('create a deal')
    .post('/deals?associations[]=deal.gallery&associations[]=deal.property_type&associations[]=brand_property_type.checklists', data)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        ...data,
        property_type: omit(results.brand.addPropertyType.data, 'checklists')
      }
    })
}

const patchListing = cb => {
  const patch = {
    listing: results.listing.getListing.data.id,
  }
  const expected_object = Object.assign({}, omit(results.deal.create.data, ['gallery', 'property_type']), patch)

  return frisby.create('set a listing for a deal')
    .patch(`/deals/${results.deal.create.data.id}/listing`, patch)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: expected_object
    })
}

const patchPropertyType = cb => {
  const patch = {
    property_type: results.brand.addPropertyType.data.id
  }

  return frisby.create('change property type of a deal')
    .patch(`/deals/${results.deal.create.data.id}/property_type?associations[]=deal.property_type`, patch)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        ...results.deal.patchListing.data
      }
    })
}

const patchDraft = cb => {
  const patch = {
    is_draft: false
  }

  results.deal.patchPropertyType.data.is_draft = false
  delete results.deal.patchPropertyType.data.faired_at

  const expected_object = Object.assign({}, results.deal.patchPropertyType.data, patch)

  return frisby.create('publish a deal to live mode')
    .patch(`/deals/${results.deal.create.data.id}/draft?associations[]=deal.property_type`, patch)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: expected_object
    })
}

const addContext = cb => {
  const checklist = results.deal.addChecklist.data.id

  const context = [
    {
      definition: results.brand.addDateContext.data.id,
      checklist,
      value: '2017/12/06'
    },

    {
      definition: results.brand.addTextContext.data.id,
      checklist,
      value: 'Active Option Period'
    },
  ]

  const expected_object = Object.assign({}, omit(results.deal.create.data, [
    'brokerwolf_tier_id',
    'brokerwolf_id',
    'brokerwolf_row_version',
    'email',
    'gallery',
    'property_type'
  ]), {
    context: {
      list_date: {
        data_type: 'Date',
        date: moment.utc('2017/12/06', 'YYYY/MM/DD').unix()
      },
      contract_status: {
        data_type: 'Text',
        text: 'Active Option Period'
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
  const cid = results.deal.addContext.data.context.list_date.id

  delete results.deal.addContext.data.context.list_date

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
      office_address: {
        house_num: '11687',
        name: 'Bellagio',
        suftype: 'Rd',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postcode: '90049'
      }
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
      data: []
    })
}


const get = (cb) => {
  return frisby.create('get a deal')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const getForms = cb => {
  return frisby.create('get forms applicable to a deal')
    .get(`/deals/${results.deal.create.data.id}/forms`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

const getTemplates = cb => {
  const form = results.brand.addTemplate.data.form
  const deal = results.deal.create.data.id

  return frisby.create('get form templates applicable to a deal form')
    .get(`/deals/${deal}/forms/templates/${form}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.brand.addTemplate.data]
    })
}

const getContexts = cb => {
  return frisby.create('get context applicable to a deal')
    .get(`/deals/${results.deal.create.data.id}/contexts`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

const addChecklist = cb => {
  const checklist = {
    title: 'Offered Checklist',
    order: 1
  }

  results.deal.create.data.has_active_offer = true // We are adding the active offer right now

  return frisby.create('add a checklist')
    .post(`/deals/${results.deal.create.data.id}/checklists`, {
      checklist,

      conditions: {
        checklist_type: results.brand.addChecklist.data.checklist_type,
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
    is_deletable: true,
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

function addFile(cb) {
  const file = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('add file to a task')
    .post(
      `/tasks/${results.deal.addTask.data.id}/attachments`,
      {
        file
      },
      {
        json: false,
        form: true
      }
    )
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(200)
}

function renameFile(cb) {
  const task = results.deal.addTask.data.id
  const file = JSON.parse(results.deal.addFile).data.id // File upload call has json:true, therefore not parsed

  const filename = 'renamed.png'

  return frisby
    .create('rename a file')
    .post(`/tasks/${task}/files/${file}/rename`, {filename})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        name: filename,
        mime: 'image/png'
      }
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
    title: 'Another Task for Gholi',
    required: false
  }

  return frisby.create('edit another task\'s title')
    .patch(`/tasks/${results.deal.addAnotherTask.data.id}`, props)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: props
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

const sortTasks = cb => {
  const tasks = [{
    id: results.deal.addTask.data.id,
    order: 2
  }, {
    id: results.deal.addAnotherTask.data.id,
    order: 1
  }]

  return frisby.create('sort tasks')
    .put(`/deals/${results.deal.create.data.id}/checklists/${results.deal.addChecklist.data.id}/sort`, tasks)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
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
        deleted_at: Number
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

const getSubmissionPdf = cb => {
  const url = results.deal.addTask.data.pdf_url.replace(process.argv[3], '')

  return frisby.create('download submission pdf')
    .get(url)
    .after(cb)
    .expectStatus(200)
}

const getContextHistory = cb => {
  return frisby.create('get context history on a deal')
    .get(`/deals/${results.deal.create.data.id}/context/list_date`)
    .expectStatus(200)
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

const patchRequired = cb => {
  const required = true

  return frisby.create('Mark a task as required')
    .patch(`/tasks/${results.deal.addTask.data.id}/required`, {
      required
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        required
      }
    })
}

const patchAttention = cb => {
  const attention_requested = true
  return frisby.create('Change the attention state of a task')
    .patch(`/tasks/${results.deal.addTask.data.id}/attention_requested`, {
      attention_requested
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        attention_requested
      }
    })
}

const patchAttentionOff = cb => {
  const attention_requested = false
  return frisby.create('Change the attention state of a task to off')
    .patch(`/tasks/${results.deal.addTask.data.id}/attention_requested`, {
      attention_requested
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        attention_requested
      }
    })
}

const seamlessAttention = cb => {
  const { room } = results.deal.getTask.data
  const address = Crypto.encrypt(JSON.stringify({
    room_id: room.id,
    user_id: results.authorize.token.data.id
  })) + '@' + config.email.seamless_address

  const body = {
    domain: config.mailgun.domain, //mailgun is property of config object. Contains API keys for mailgun.
    'stripped-text': 'Foobar',
    recipient: address,
  }

  return frisby.create('send seamless email')
    .post('/messages/email', body) //POST request to /messages/email with body object sent.
    .after(cb)
    .expectStatus(200)
}

const verifySeamlessAttention = cb => {
  return frisby.create('verify seamless email has worked')
    .get(`/tasks/${results.deal.addTask.data.id}`)
    .after(cb)
    .expectJSON({
      data: {
        attention_requested: true,
        room: {
          latest_activity: {
            author: {
              id: results.authorize.token.data.id
            }
          }
        }
      }
    })
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
      query: 'Imaginary',
      $order: ['deals.updated_at', 'DESC'],
      limit: 100,
      start: 0
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

const filterToXlsx = (cb) => {
  return frisby.create('search for a deal and export it to xlsx')
    .post('/deals/filter.xlsx', {
      query: 'Imaginary',
      $order: ['deals.updated_at', 'DESC'],
      limit: 100,
      start: 0
    })
    .after(cb)
    .expectStatus(200)
}

const filterByContext = (cb) => {
  return frisby.create('search for a deal by context')
    .post('/deals/filter', {
      contexts: {
        contract_status: {
          text: [
            'Active Option Period'
          ]
        }
      }
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

const filterByContextEmpty = (cb) => {
  return frisby.create('search for a deal by context that doesn\'t exist')
    .post('/deals/filter', {
      contexts: {
        contract_status: {
          text: [
            'Not Active Option Period'
          ]
        }
      }
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 0
      }
    })
}

function createGalleryItem(cb) {
  const deal_id = results.deal.create.data.id
  const file = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('add item to a deal gallery')
    .post(
      `/deals/${deal_id}/gallery/items`,
      {
        file
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

function updateGalleryItem(cb) {
  const deal_id = results.deal.create.data.id
  const saved = JSON.parse(results.deal.createGalleryItem).data

  const item = {
    name: 'Updated Name',
    description: 'Updated Description',
    order: 2,
    file: saved.file.id
  }

  return frisby
    .create('update a gallery item')
    .put(`/deals/${deal_id}/gallery/items/${saved.id}`, item)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

function updateGalleryItemFile(cb) {
  const deal_id = results.deal.create.data.id
  const saved = JSON.parse(results.deal.createGalleryItem).data
  const file = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('update the file of a media gallery item')
    .patch(`/deals/${deal_id}/gallery/items/${saved.id}/file`,
      {
        file
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

function deleteGalleryItems(cb) {
  const deal_id = results.deal.create.data.id
  const item = results.deal.updateGalleryItem.data

  return frisby
    .create('delete a gallery item')
    .delete(`/deals/${deal_id}/gallery/items`, {
      items: [
        item.id
      ]
    })
    .after(cb)
    .expectStatus(204)
}

function sortGalleryItems(cb) {
  const deal_id = results.deal.create.data.id
  const item = results.deal.updateGalleryItem.data

  const items = [
    {
      id: item.id,
      order: item.order + 1
    }
  ]

  return frisby
    .create('sort a gallery')
    .put(`/deals/${deal_id}/gallery/items/sort`, items)
    .after(cb)
    .expectJSON({
      code: 'OK',
      data: items
    })
    .expectStatus(200)
}

function createGalleryZipUrl(cb) {
  const id = results.deal.create.data.id

  const items = results.deal.sortGalleryItems.data.map(r => r.id)

  return frisby
    .create('create a zip gallery url')
    .post(`/deals/${id}/gallery.zip`, {items})
    .after(cb)
    .expectStatus(200)
}

function downloadGalleryZip(cb) {
  const url = results.deal.createGalleryZipUrl.info.url.replace(process.argv[3], '')

  return frisby
    .create('download gallery zip file')
    .get(url)
    .after(cb)
    .expectStatus(200)
}

function downloadDealZip(cb) {
  return frisby
    .create('download a deal zip archive')
    .get(`/deals/${results.deal.create.data.id}.zip`)
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  getRoleDefinitions,
  create,
  addChecklist,
  addContext,
  approveContext,
  patchListing,
  patchPropertyType,
  patchDraft,
  addRole,
  updateRole,
  get,
  getAll,
  getBrandInbox,
  getBrandDeals,
  getBrandXls,
  getForms,
  getContexts,
  getTemplates,
  filter,
  filterToXlsx,
  filterByContext,
  filterByContextEmpty,
  updateChecklist,
  addTask,
  addAnotherTask,
  addFile,
  renameFile,
  updateTask,
  updateTasks,
  sortTasks,
  removeTask,
  makeSureAnotherTaskIsDeleted,
  makeSureAnotherTaskIsntReturnedInDealContext,
  getSubmissionPdf,
  setSubmission,
  updateSubmission,
  getContextHistory,
  addActivity,
  getRevision,
  getTask,
  setReview,
  sendNotifications,
  patchRequired,
  patchAttention,
  patchAttentionOff,
  postMessage,
  seamlessAttention,
  verifySeamlessAttention,
  createGalleryItem,
  updateGalleryItem,
  updateGalleryItemFile,
  deleteGalleryItems,
  sortGalleryItems,
  createGalleryZipUrl,
  downloadGalleryZip,
  downloadDealZip,
  removeRole,
  remove
}
