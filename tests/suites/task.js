const uuid = require('node-uuid')
const { task } = require('./data/task')

registerSuite('contact', ['create'])

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

function update(cb) {
  return frisby.create('update task contact')
    .put(`/crm/tasks/${results.task.create.data.id}/?associations[]=crm_task.contact`, Object.assign({
      contact: results.contact.create.data[0].id
    }, task))
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

function getAllDoesntIgnoreFilters(cb) {
  return frisby.create('make sure filters are not ignored')
    .get(`/crm/tasks/?contact=${uuid.v4()}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function filterByContact(cb) {
  return frisby.create('get tasks related to a contact')
    .get(`/crm/tasks/?contact=${results.contact.create.data[0].id}`)
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
    .expectJSONLength('data', 0)
}

module.exports = {
  create,
  createWithInvalidData,
  getForUser,
  update,
  updateWithInvalidData,
  getAllDoesntIgnoreFilters,
  filterByContact,
  filterByInvalidDealId,
  remove,
  makeSureTaskIsDeleted,
}