registerSuite('contact', ['create'])

const { task } = require('./data/task')

function create(cb) {
  return frisby.create('create a task')
    .post('/crm/tasks', Object.assign({
      contact: results.contact.create.data[0].id
    }, task))
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: task
    })
}

function getForUser(cb) {
  return frisby.create('get list of assigned tasks')
    .get('/crm/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
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
  getForUser,
  remove,
  makeSureTaskIsDeleted,
}