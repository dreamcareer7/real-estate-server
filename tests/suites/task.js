const uuid = require('node-uuid')
const { task, fixed_reminder, relative_reminder } = require('./data/task')

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
    }]
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
  const data = Object.assign({}, task, {
    associations: [{
      association_type: 'contact',
      contact: '123123'
    }]
  })
  delete data.title

  return frisby.create('create a task fails with invalid')
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
    .post(`/crm/tasks/${results.task.create.data.id}/associations?associations[]=crm_task.associations`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        associations: results.task.create.data.associations.concat([{
          association_type: 'contact',
          crm_task: results.task.create.data.id
        }])
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

function removeContactAssociation(cb) {
  const task_id = results.task.create.data.id
  const association_id = results.task.addContactAssociation.data.associations.find(a => a.association_type === 'contact').id
  return frisby.create('delete the contact association from task')
    .delete(`/crm/tasks/${task_id}/associations/${association_id}?associations[]=crm_task.associations`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        associations: results.task.create.data.associations.filter(a => a.association_type === 'listing')
      }
    })
}

function addFixedReminder(cb) {
  const data = Object.assign({}, results.task.updateTask.data, {
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
    .get(`/crm/tasks/?contact=${results.contact.create.data[0].id}&start=0&limit=10&associations[]=crm_task.associations`)
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
  updateTask,
  addContactAssociation,
  fetchAssociations,
  addInvalidAssociation,
  createAnotherTaskWithRelativeReminder,
  addFixedReminder,
  getAllReturnsAll,
  getAllDoesntIgnoreFilters,
  filterByContact,
  filterByInvalidDealId,
  removeContactAssociation,
  remove,
  makeSureTaskIsDeleted,
}