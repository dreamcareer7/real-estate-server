const uuid = require('node-uuid')
const { task, fixed_reminder, relative_reminder } = require('./data/task')

registerSuite('contact', ['create'])

function fixResponseTaskToInput(task) {
  if (task.contact)
    task.contact = task.contact.id
  if (task.deal)
    task.deal = task.deal.id
  if (task.listing)
    task.listing = task.listing.id
  if (task.assignee)
    delete task.assignee
}

function create(cb) {
  return frisby.create('create a task')
    .post('/crm/tasks', task)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: task
    })
}

function createWithInvalidData(cb) {
  const data = Object.assign({}, task, {
    contact: '123123'
  })
  delete data.title

  return frisby.create('create a task fails with invalid')
    .post('/crm/tasks', data)
    .after(cb)
    .expectStatus(400)
}

function getForUser(cb) {
  return frisby.create('get list of assigned tasks')
    .get('/crm/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function updateContact(cb) {
  const data = Object.assign({}, results.task.create.data, {
    contact: results.contact.create.data[0].id
  })

  return frisby.create('update task contact')
    .put(`/crm/tasks/${results.task.create.data.id}/?associations[]=crm_task.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        contact: {
          id: results.contact.create.data[0].id
        }
      }
    })
}

function updateWithInvalidData(cb) {
  const data = Object.assign({}, task, {
    contact: '123123'
  })

  return frisby.create('update task fails with invalid contact id')
    .put(`/crm/tasks/${results.task.create.data.id}/?associations[]=crm_task.contact`, data)
    .after(cb)
    .expectStatus(400)
}

function addFixedReminder(cb) {
  const data = Object.assign({}, results.task.updateContact.data, {
    reminders: [fixed_reminder]
  })

  fixResponseTaskToInput(data)

  return frisby.create('add a fixed reminder')
    .put(`/crm/tasks/${results.task.create.data.id}/?associations[]=crm_task.reminders`, data)
    .after(cb)
    .expectStatus(200)
}

function createAnotherTaskWithRelativeReminder(cb) {
  const data = Object.assign({}, task, {
    reminders: [relative_reminder]
  })

  return frisby.create('create a task with a relative reminder')
    .post('/crm/tasks?associations[]=crm_task.reminders', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: Object.assign({}, data, {
        reminders: [{
          timestamp: data.due_date + relative_reminder.time * 1000
        }]
      })
    })
}

function getAllReturnsAll(cb) {
  return frisby.create('make sure we get everything without filters')
    .get('/crm/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 2)
}

function getAllDoesntIgnoreFilters(cb) {
  return frisby.create('make sure filters are not ignored')
    .get(`/crm/tasks/?contact=${uuid.v4()}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function filterByContact(cb) {
  return frisby.create('get tasks related to a contact')
    .get(`/crm/tasks/?contact=${results.contact.create.data[0].id}&start=0&limit=10`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function filterByInvalidDealId(cb) {
  return frisby.create('filtering tasks fails with an invalid deal id')
    .get('/crm/tasks/?deal=123456')
    .after(cb)
    .expectStatus(400)
}

function remove(cb) {
  return frisby.create('delete a task')
    .delete(`/crm/tasks/${results.task.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureTaskIsDeleted(cb) {
  return frisby.create('make sure task is deleted')
    .get('/crm/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', results.task.getAllReturnsAll.data.length - 1)
}

module.exports = {
  create,
  createWithInvalidData,
  getForUser,
  updateContact,
  updateWithInvalidData,
  createAnotherTaskWithRelativeReminder,
  addFixedReminder,
  getAllReturnsAll,
  getAllDoesntIgnoreFilters,
  filterByContact,
  filterByInvalidDealId,
  remove,
  makeSureTaskIsDeleted,
}