const config = require('../../lib/config.js')
const uuid = require('node-uuid')
const { task, fixed_reminder, relative_reminder } = require('./data/task')
const anotherUser = require('./data/user')

registerSuite('contact', ['create'])
registerSuite('listing', ['by_mui'])

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
  const data = Object.assign({}, task, {
    associations: [{
      association_type: 'listing',
      listing: results.listing.by_mui.data.id
    }]
  })

  const expected = Object.assign({}, data, {
    associations: [{
      association_type: 'listing'
    }],
    listings: [
      results.listing.by_mui.data.id
    ]
  })

  return frisby.create('create a task')
    .post('/crm/tasks?associations[]=crm_task.associations', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: expected
    })
}

function createWithInvalidData(cb) {
  const data = Object.assign({
    title: 'Invalid task',
    due_date: Date.now() + 3600
  })

  return frisby.create('create a task fails without all required fields')
    .post('/crm/tasks', data)
    .after(cb)
    .expectStatus(400)
}

function createWithInvalidAssociationId(cb) {
  const data = Object.assign({}, task, {
    associations: [{
      association_type: 'contact',
      contact: '123123'
    }]
  })
  delete data.title

  return frisby.create('create a task fails with invalid contact id')
    .post('/crm/tasks', data)
    .after(cb)
    .expectStatus(400)
}

function getForUser(cb) {
  return frisby.create('get list of assigned tasks')
    .get('/crm/tasks/')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function updateTask(cb) {
  return frisby.create('update status of a task')
    .put('/crm/tasks/' + results.task.create.data.id, Object.assign({}, task, {
      status: 'DONE'
    }))
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        status: 'DONE'
      }
    })
}

function addContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby.create('add a contact association')
    .post(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        association_type: 'contact',
        crm_task: results.task.create.data.id,
        contact: {
          id: results.contact.create.data[0].id
        }
      }
    })
}

function fetchAssociations(cb) {
  return frisby.create('fetch actual associated objects')
    .get(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        type: 'crm_association',
        crm_task: results.task.create.data.id,
        association_type: 'listing',
        listing: {
          type: 'listing',
          id: results.listing.by_mui.data.id
        }
      }, {
        type: 'crm_association',
        crm_task: results.task.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.create.data[0].id,
          type: 'contact',
          users: undefined,
          deals: undefined
        }
      }]
    })
}

function addInvalidAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: '123123'
  }

  return frisby.create('add association fails with invalid contact id')
    .post(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_task.associations`, data)
    .after(cb)
    .expectStatus(400)
}

function addFixedReminder(cb) {
  const data = Object.assign({}, results.task.updateTask.data, {
    reminders: [fixed_reminder],
    description: undefined
  })

  fixResponseTaskToInput(data)

  return frisby.create('add a fixed reminder')
    .put(`/crm/tasks/${results.task.create.data.id}/?associations[]=crm_task.reminders`, data)
    .after(cb)
    .expectStatus(200)
}

function createAnotherTaskWithRelativeReminder(cb) {
  const data = Object.assign({}, task, {
    title: 'Task with relative reminder',
    reminders: [relative_reminder]
  })

  return frisby.create('create a task with a relative reminder')
    .post('/crm/tasks?associations[]=crm_task.reminders', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: Object.assign({}, data, {
        reminders: [{
          timestamp: data.due_date - relative_reminder.time
        }]
      })
    })
}

function getAllReturnsAll(cb) {
  return frisby.create('make sure we get everything without filters')
    .get('/crm/tasks?associations[]=crm_task.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 2
      }
    })
    .expectJSONLength('data', 2)
}

function orderWorks(cb) {
  return frisby.create('make sure order by due_date works')
    .get('/crm/tasks?order=-due_date')
    .after((err, res, json) => {
      if (err)
        return cb(err)
      cb(undefined, res, json)
    })
    .expectJSON({
      info: {
        total: 2
      }
    })
    .expectStatus(200)
}

function getSingleTask(cb) {
  return frisby.create('make sure get a single task by id works')
    .get(`/crm/tasks/${results.task.create.data.id}?associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(200)
}

function getAllDoesntIgnoreFilters(cb) {
  return frisby.create('make sure filters are not ignored')
    .get(`/crm/tasks/?contact=${uuid.v4()}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 0
      }
    })
    .expectJSONLength('data', 0)
}

function stringFilter(cb) {
  return frisby.create('string search in tasks')
    .get(`/crm/tasks/?q=Hello World&start=0&limit=10&associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.task.create.data.id,
        title: task.title
      }]
    })
    .expectJSONLength('data', 1)
}

function stringFilterReturnsEmptyWhenNoResults(cb) {
  return frisby.create('string search in tasks returns empty array when no tasks are found')
    .get(`/crm/tasks/?q=Goodbye&start=0&limit=10&associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [],
      info: {
        total: 0
      }
    })
    .expectJSONLength('data', 0)
}

function filterByContact(cb) {
  return frisby.create('get tasks related to a contact')
    .get(`/crm/tasks/?contact=${results.contact.create.data[0].id}&start=0&limit=10&associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 1
      }
    })
    .expectJSONLength('data', 1)
}

function filterByInvalidDealId(cb) {
  return frisby.create('filtering tasks fails with an invalid deal id')
    .get('/crm/tasks/?deal=123456')
    .after(cb)
    .expectStatus(400)
}

const loginAsAnotherUser = (cb) => {
  const auth_params = {
    client_id: config.tests.client_id,
    client_secret: config.tests.client_secret,
    username: anotherUser.email,
    password: anotherUser.password,
    grant_type: 'password'
  }

  return frisby.create('login as another user')
    .post('/oauth2/token', auth_params)
    .after(cb)
    .expectStatus(200)
}

function anotherUserCantAccessCreatedTasks(cb) {
  return frisby.create('another user cannot access tasks for the original user')
    .get('/crm/tasks?associations[]=crm_task.associations')
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function anotherUserCantAccessTaskById(cb) {
  return frisby.create('another user cannot access a single task by id')
    .get(`/crm/tasks/${results.task.create.data.id}?associations[]=crm_task.associations`)
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAssociations(cb) {
  return frisby.create('another user cannot fetch task associations')
    .get(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantEditCreatedTasks(cb) {
  return frisby.create('another user cannot update tasks for the original user')
    .put('/crm/tasks/' + results.task.create.data.id, Object.assign({}, task, {
      status: 'PENDING'
    }))
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantAddContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby.create('another user cannot add a contact association')
    .post(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveCreatedTasks(cb) {
  return frisby.create('another user cannot remove tasks for the original user')
    .delete(`/crm/tasks/${results.task.create.data.id}`)
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveContactAssociation(cb) {
  const task_id = results.task.create.data.id
  const association_id = results.task.addContactAssociation.data.id
  return frisby.create('another user cannot delete the contact association from task')
    .delete(`/crm/tasks/${task_id}/associations/${association_id}?associations[]=crm_task.associations`)
    .addHeader('Authorization', 'Bearer ' + results.task.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function removeContactAssociation(cb) {
  const task_id = results.task.create.data.id
  const association_id = results.task.addContactAssociation.data.id
  return frisby.create('delete the contact association from task')
    .delete(`/crm/tasks/${task_id}/associations/${association_id}?associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(204)
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
  createWithInvalidAssociationId,
  getForUser,
  updateTask,
  addContactAssociation,
  fetchAssociations,
  addInvalidAssociation,
  createAnotherTaskWithRelativeReminder,
  addFixedReminder,
  getAllReturnsAll,
  orderWorks,
  getAllDoesntIgnoreFilters,
  getSingleTask,
  stringFilter,
  stringFilterReturnsEmptyWhenNoResults,
  filterByContact,
  filterByInvalidDealId,
  loginAsAnotherUser,
  anotherUserCantAccessCreatedTasks,
  anotherUserCantAccessTaskById,
  anotherUserCantFetchAssociations,
  anotherUserCantEditCreatedTasks,
  anotherUserCantAddContactAssociation,
  anotherUserCantRemoveCreatedTasks,
  anotherUserCantRemoveContactAssociation,
  removeContactAssociation,
  remove,
  makeSureTaskIsDeleted,
}