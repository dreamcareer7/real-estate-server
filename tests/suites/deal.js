const {deal, address, full_address} = require('./data/deal.js')
const deal_response = require('./expected_objects/deal.js')

registerSuite('listing', ['getListing'])
registerSuite('brand', ['createParent', 'create', 'addChecklist', 'addTask'])

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
      data: deal
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const createHippocket = cb => {
  const data = JSON.parse(JSON.stringify(deal))
  data.context.full_address = full_address

  return frisby.create('create a hippocket deal')
    .post('/deals', data)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        context: address
      }
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const addRole = cb => {
  const role = {
    first_name: 'Imaginary',
    last_name: 'Lawyer',
    email: 'imaginary_lawyer@rechat.com',
    role: 'Lawyer'
  }

  results.deal.create.data.roles = [
    {
      type: 'deal_role',
      role: role.role,
      user: {
        first_name: role.first_name,
        last_name: role.last_name,
        email: role.email
      }
    }
  ]

  return frisby.create('add a role to a deal')
    .post(`/deals/${results.deal.create.data.id}/roles`, role)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.create.data
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
      data: [results.deal.createHippocket.data, results.deal.create.data]
    })
}


const get = (cb) => {
  return frisby.create('get a deal')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.create.data
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
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

module.exports = {
  create,
  createHippocket,
  addRole,
  get,
  getAll,
  addChecklist,
  addTask,
  setSubmission,
  getRevision,
  getTask,
  setReview,
  patchAttention,
  remove
}
