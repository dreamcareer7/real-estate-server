const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

const config = require('../../../lib/config.js')
const { task, fixed_reminder, relative_reminder, abbasUser } = require('./data/task')
const anotherUser = require('./data/user')
const brand = require('./data/brand.js')

registerSuite('contact', [
  'getAttributeDefs',
  'create',
  'createCompanyContact',
  'importManyContacts',
  'getContacts'
])
registerSuite('listing', ['by_mls'])

function fixResponseTaskToInput(original) {
  const task = { ...original }
  if (!task.description) delete task.description

  if (Array.isArray(task.associations)) {
    for (const assoc of task.associations) {
      if (assoc.contact) assoc.contact = assoc.contact.id
      if (assoc.deal) assoc.deal = assoc.deal.id
      if (assoc.listing) assoc.listing = assoc.listing.id
    }
  }

  return task
}

function registerNewUser(cb) {
  return frisby
    .create('register a new team member')
    .post('/users', abbasUser)
    .after(cb)
    .expectStatus(201)
}

function addAbbasToBrand(cb) {
  const brand_id = results.brand.create.data.id
  const role_id = results.brand.addRole.data.id

  return frisby
    .create('add Abbas to the team')
    .post(`/brands/${brand_id}/roles/${role_id}/members`, {
      users: [results.task.registerNewUser.data.id]
    })
    .after(cb)
    .expectStatus(200)  
}

const getTokenForAbbas = cb => {
  const auth_params = {
    client_id: config.tests.client_id,
    client_secret: config.tests.client_secret,
    username: abbasUser.email,
    password: abbasUser.password,
    grant_type: 'password'
  }

  return frisby
    .create('login as another user')
    .post('/oauth2/token', auth_params)
    .after(cb)
    .expectStatus(200)
}

function create(cb) {
  const data = Object.assign({}, task, {
    associations: [
      {
        association_type: 'listing',
        listing: results.listing.by_mls.data[0].id
      }
    ],
    assignees: [
      results.task.registerNewUser.data.id
    ]
  })

  const expected = Object.assign({}, data, {
    associations: [
      {
        association_type: 'listing'
      }
    ],
    assignees: [{
      id: results.task.registerNewUser.data.id
    }],
    listings: [results.listing.by_mls.data[0].id]
  })

  return frisby
    .create('create a task')
    .post('/crm/tasks?associations[]=crm_task.associations&associations[]=crm_task.assignees', data)
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

  return frisby
    .create('create a task fails without all required fields')
    .post('/crm/tasks', data)
    .after(cb)
    .expectStatus(400)
}

function createWithInvalidAssociationId(cb) {
  const data = Object.assign({}, task, {
    associations: [
      {
        association_type: 'contact',
        contact: '123123'
      }
    ]
  })
  delete data.title

  return frisby
    .create('create a task fails with invalid contact id')
    .post('/crm/tasks', data)
    .after(cb)
    .expectStatus(400)
}

function getForUser(cb) {
  return frisby
    .create('get list of assigned tasks')
    .get('/crm/tasks/')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function updateTask(cb) {
  return frisby
    .create('update status of a task')
    .put(
      '/crm/tasks/' + results.task.create.data.id,
      Object.assign({}, task, {
        status: 'DONE'
      })
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        status: 'DONE'
      }
    })
}

function cloneTask(cb) {
  const task_id = results.task.create.data.id
  const new_title = 'follow-up'
  return frisby
    .create('clone a task')
    .post(
      `/crm/tasks/${task_id}/clone?associations[]=crm_task.associations`,
      { title: new_title }
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        task_type: 'Todo',
        title: new_title,
        associations: [{
          association_type: 'listing'
        }]
      }
    })
}

function updateAssignee(cb) {
  const updated_task = fixResponseTaskToInput(results.task.updateTask.data)

  const data = Object.assign({}, updated_task, {
    assignees: [
      results.authorize.token.data.id
    ]
  })

  return frisby
    .create('re-assign a task to someone else')
    .put(
      `/crm/tasks/${results.task.create.data.id}?associations[]=crm_task.assignees`,
      data
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        assignees: [{
          id: results.authorize.token.data.id
        }]
      }
    })
}

function addContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id,
    index: 1,
    metadata: {
      note: 'Hey, this is a note'
    }
  }

  return frisby
    .create('add a contact association')
    .post(
      `/crm/tasks/${
        results.task.create.data.id
      }/associations?associations[]=crm_association.contact`,
      data
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        association_type: 'contact',
        type: 'crm_association',
        index: 1,
        crm_task: results.task.create.data.id,
        contact: {
          id: results.contact.create.data[0].id
        },
        metadata: {
          note: 'Hey, this is a note'
        }
      }
    })
}

function refreshTaskAssociations(cb) {
  return frisby
    .create('refresh task associations')
    .get(
      `/crm/tasks/${
        results.task.create.data.id
      }?associations[]=crm_association.contact&associations[]=crm_task.associations&associations[]=crm_association.listing`
    )
    .after(cb)
    .expectStatus(200)
}

function addBulkContactAssociations(cb) {
  const task = fixResponseTaskToInput(results.task.refreshTaskAssociations.data)

  const associations = [
    ...task.associations,
    {
      association_type: 'contact',
      contact: results.contact.getContacts.data[2].id
    },
    {
      association_type: 'contact',
      contact: results.contact.getContacts.data[3].id
    }
  ]

  const data = Object.assign(task, {
    status: 'DONE',
    associations
  })

  return frisby
    .create('add multiple contact associations')
    .put(
      `/crm/tasks/${
        results.task.create.data.id
      }?associations[]=crm_association.contact&associations[]=crm_task.associations`,
      data
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        associations: [
          {
          },
          {
          },
          {
            association_type: 'contact',
            crm_task: results.task.create.data.id,
            contact: {
              id: results.contact.getContacts.data[2].id
            }
          },
          {
            association_type: 'contact',
            crm_task: results.task.create.data.id,
            contact: {
              id: results.contact.getContacts.data[3].id
            }
          }
        ]
      }
    })
}

function fetchAssociations(cb) {
  return frisby
    .create('fetch actual associated objects')
    .get(
      `/crm/tasks/${
        results.task.create.data.id
      }/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`
    )
    .after((err, res, json) => {
      if (err) return cb(err, res, json)

      const associated_contacts = json.data.filter(a => a.association_type === 'contact').map(a => a.contact.id)

      expect(associated_contacts).to.have.members([
        results.contact.create.data[0].id,
        results.contact.getContacts.data[2].id,
        results.contact.getContacts.data[3].id
      ])

      expect(json.data.filter(a => a.association_type === 'listing')).to.have.length(1)
      expect(json.data.find(a => a.association_type === 'listing').listing.id).to.be.equal(results.listing.by_mls.data[0].id)

      cb(undefined, res, json)
    })
    .expectStatus(200)
}

function addInvalidAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: '123123'
  }

  return frisby
    .create('add association fails with invalid contact id')
    .post(
      `/crm/tasks/${
        results.task.create.data.id
      }/associations?associations[]=crm_task.associations`,
      data
    )
    .after(cb)
    .expectStatus(400)
}

function addFixedReminder(cb) {
  let data = Object.assign({}, results.task.updateTask.data, {
    reminders: [fixed_reminder]
  })
  delete data.description

  data = fixResponseTaskToInput(data)

  return frisby
    .create('add a fixed reminder')
    .put(
      `/crm/tasks/${
        results.task.create.data.id
      }/?associations[]=crm_task.reminders`,
      data
    )
    .after(cb)
    .expectJSON({
      data: {
        reminders: [fixed_reminder],
        description: undefined
      }
    })
    .expectStatus(200)
}

function updateFixedReminder(cb) {
  const oldReminder = results.task.addFixedReminder.data.reminders[0]
  const reminder = Object.assign({
    id: oldReminder.id,
    is_relative: oldReminder.is_relative,
    timestamp: new Date().getTime() / 1000 + 3600 * 24
  })

  let data = Object.assign({}, results.task.addFixedReminder.data, {
    reminders: [reminder]
  })
  delete data.description

  data = fixResponseTaskToInput(data)

  return frisby
    .create('update the fixed reminder')
    .put(
      `/crm/tasks/${
        results.task.create.data.id
      }/?associations[]=crm_task.reminders`,
      data
    )
    .after(cb)
    .expectJSON({
      data: {
        reminders: [reminder]
      }
    })
    .expectStatus(200)
}

function attachFile(cb) {
  const task_id = results.task.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('attach file to a task')
    .post(
      `/crm/tasks/${task_id}/files?associations[]=crm_task.files`,
      {
        file: logo
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

function fetchTaskWithAttachments(cb) {
  const task_id = results.task.create.data.id

  return frisby
    .create('get task with attachmets')
    .get(`/crm/tasks/${task_id}?associations[]=crm_task.files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        files: [
          {
            name: 'logo.png'
          }
        ]
      }
    })
}

function fetchAttachments(cb) {
  const task_id = results.task.create.data.id

  return frisby
    .create('get task attachmets')
    .get(`/crm/tasks/${task_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          name: 'logo.png'
        }
      ]
    })
}

function createAnotherTaskWithRelativeReminder(cb) {
  const data = Object.assign({}, task, {
    title: 'Task with relative reminder',
    reminders: [relative_reminder]
  })

  return frisby
    .create('create a task with a relative reminder')
    .post('/crm/tasks?associations[]=crm_task.reminders', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: Object.assign({}, data, {
        reminders: [
          {
            timestamp: relative_reminder.timestamp
          }
        ]
      })
    })
}

function getAllReturnsAll(cb) {
  return frisby
    .create('make sure we get everything without filters')
    .get('/crm/tasks?associations[]=crm_task.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 3
      }
    })
    .expectJSONLength('data', 3)
}

function orderWorks(cb) {
  return frisby
    .create('make sure order by due_date works')
    .get('/crm/tasks?order=-due_date')
    .after((err, res, json) => {
      if (err) return cb(err)
      cb(undefined, res, json)
    })
    .expectJSON({
      info: {
        total: 3
      }
    })
    .expectStatus(200)
}

function getSingleTask(cb) {
  return frisby
    .create('make sure get a single task by id works')
    .get(
      `/crm/tasks/${
        results.task.create.data.id
      }?associations[]=crm_task.associations&associations[]=crm_task.assignees`
    )
    .after(cb)
    .expectJSON({
      data: {
        id: results.task.create.data.id
      }
    })
    .expectStatus(200)
}

function getAllDoesntIgnoreFilters(cb) {
  return frisby
    .create('make sure filters are not ignored')
    .get(`/crm/tasks/search/?contact=${uuid.v4()}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 0
      }
    })
    .expectJSONLength('data', 0)
}

function filterByDueDate(cb) {
  return frisby
    .create('filter tasks by due date')
    .get(
      `/crm/tasks/search/?due_gte=${results.task.create.data.created_at - 2}`
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 3
      }
    })
    .expectJSONLength('data', 3)
}

function stringFilter(cb) {
  return frisby
    .create('string search in tasks')
    .get(
      '/crm/tasks/search/?q[]=Hello&start=0&limit=10&associations[]=crm_task.associations'
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          id: results.task.create.data.id,
          title: task.title
        }
      ]
    })
    .expectJSONLength('data', 1)
}

function stringFilterAcceptsMultipleQ(cb) {
  return frisby
    .create('string search accepts multiple q arguments')
    .get(
      '/crm/tasks/search/?q[]=Hello&q[]=World&start=0&limit=10&associations[]=crm_task.associations'
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          id: results.task.create.data.id,
          title: task.title
        }
      ]
    })
    .expectJSONLength('data', 1)
}

function substringFilter(cb) {
  return frisby
    .create('partial string search in tasks')
    .get(
      '/crm/tasks/search/?q[]=Wor&start=0&limit=10&associations[]=crm_task.associations'
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          id: results.task.create.data.id,
          title: task.title
        }
      ]
    })
    .expectJSONLength('data', 1)
}

function stringFilterReturnsEmptyWhenNoResults(cb) {
  return frisby
    .create(
      'string search in tasks returns empty array when no tasks are found'
    )
    .get(
      '/crm/tasks/search/?q=Goodbye&start=0&limit=10&associations[]=crm_task.associations'
    )
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
  return frisby
    .create('get tasks related to a contact')
    .get(
      `/crm/tasks/search/?contact=${
        results.contact.create.data[0].id
      }&start=0&limit=10&associations[]=crm_task.associations`
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 1
      }
    })
    .expectJSONLength('data', 1)
}

function filterByAssignee(cb) {
  return frisby
    .create('get tasks assigned to a user')
    .get(
      `/crm/tasks/search/?assignee=${
        results.task.registerNewUser.data.id
      }&start=0&limit=10&associations[]=crm_task.assignees`
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.task.cloneTask.data.id,
        assignees: [{
          id: results.task.registerNewUser.data.id
        }]
      }],
      info: {
        total: 1
      }
    })
    .expectJSONLength('data', 1)
}

function filterByNonExistingAssignee(cb) {
  return frisby
    .create('filter by non-existing assignee')
    .get(
      `/crm/tasks/search/?assignee=${
        uuid.v4()
      }&start=0&limit=10&associations[]=crm_task.assignees`
    )
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 0
      }
    })
    .expectJSONLength('data', 0)
}

function filterByInvalidDealId(cb) {
  return frisby
    .create('filtering tasks fails with an invalid deal id')
    .get('/crm/tasks/search/?deal=123456')
    .after(cb)
    .expectStatus(400)
}

const loginAsAnotherUser = cb => {
  const auth_params = {
    client_id: config.tests.client_id,
    client_secret: config.tests.client_secret,
    username: anotherUser.email,
    password: anotherUser.password,
    grant_type: 'password'
  }

  return frisby
    .create('login as another user')
    .post('/oauth2/token', auth_params)
    .after((err, res, body) => {
      const setup = frisby.globalSetup()

      setup.request.headers['Authorization'] = 'Bearer ' + body.access_token

      frisby.globalSetup(setup)
      cb(err, res, body)
    })
    .expectStatus(200)
}

function createPersonalBrandForNewUser(cb) {
  const b = Object.assign({}, brand, {
    name: 'Other Brand',
    roles: [
      {
        role: 'Admin',
        members: [
          {
            user: results.task.loginAsAnotherUser.data.id
          }
        ],
        acl: ['Admin']
      }
    ]
  })

  return frisby
    .create('create personal brand for the new user')
    .post('/brands', b)
    .after((err, res, body) => {
      const setup = frisby.globalSetup()

      setup.request.headers['X-RECHAT-BRAND'] = body.data.id

      frisby.globalSetup(setup)
      cb(err, res, body)
    })
    .expectStatus(200)
}

function anotherUserCantAccessCreatedTasks(cb) {
  return frisby
    .create('another user cannot access tasks for the original user')
    .get('/crm/tasks?associations[]=crm_task.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function anotherUserCantAccessTaskById(cb) {
  return frisby
    .create('another user cannot access a single task by id')
    .get(
      `/crm/tasks/${
        results.task.create.data.id
      }?associations[]=crm_task.associations`
    )
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAssociations(cb) {
  return frisby
    .create('another user cannot fetch task associations')
    .get(
      `/crm/tasks/${
        results.task.create.data.id
      }/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`
    )
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantEditCreatedTasks(cb) {
  return frisby
    .create('another user cannot update tasks for the original user')
    .put(
      '/crm/tasks/' + results.task.create.data.id,
      Object.assign({}, task, {
        status: 'PENDING'
      })
    )
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantAddContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby
    .create('another user cannot add a contact association')
    .post(
      `/crm/tasks/${
        results.task.create.data.id
      }/associations?associations[]=crm_association.contact`,
      data
    )
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveCreatedTasks(cb) {
  return frisby
    .create('another user cannot remove tasks for the original user')
    .delete(`/crm/tasks/${results.task.create.data.id}`)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveContactAssociation(cb) {
  const task_id = results.task.create.data.id
  const association_id = results.task.addContactAssociation.data.id
  return frisby
    .create('another user cannot delete the contact association from task')
    .delete(
      `/crm/tasks/${task_id}/associations/${association_id}?associations[]=crm_task.associations`
    )
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantAttachFile(cb) {
  const task_id = results.task.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('another user cannot attach a file to a task')
    .post(
      `/crm/tasks/${task_id}/files?associations[]=crm_task.files`,
      {
        file: logo
      },
      {
        json: false,
        form: true
      }
    )
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAttachments(cb) {
  const task_id = results.task.create.data.id

  return frisby
    .create('another user cannot get task attachmets')
    .get(`/crm/tasks/${task_id}/files`)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveAttachment(cb) {
  const task_id = results.task.create.data.id
  const file_id = results.task.fetchAttachments.data[0].id

  return frisby
    .create('another user cannot remove a task attachment')
    .delete(`/crm/tasks/${task_id}/files/${file_id}`)
    .after((err, res, body) => {
      const setup = frisby.globalSetup()

      setup.request.headers['Authorization'] =
        'Bearer ' + results.authorize.token.access_token
      setup.request.headers['X-RECHAT-BRAND'] =
        results.brand.create.data.id

      frisby.globalSetup(setup)
      cb(err, res, body)
    })
    .expectStatus(404)
}

function removeAttachment(cb) {
  const task_id = results.task.create.data.id
  const file_id = results.task.fetchAttachments.data[0].id

  return frisby
    .create('remove a task attachment')
    .delete(`/crm/tasks/${task_id}/files/${file_id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureAttachmentIsRemoved(cb) {
  const task_id = results.task.create.data.id

  return frisby
    .create('make sure attachment is remove')
    .get(`/crm/tasks/${task_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

function removeReminder(cb) {
  const task_id = results.task.createAnotherTaskWithRelativeReminder.data.id
  const data = {
    ...results.task.createAnotherTaskWithRelativeReminder.data,
    description: undefined,
    reminders: []
  }

  return frisby
    .create('Remove reminders on a task')
    .put(`/crm/tasks/${task_id}?associations[]=crm_task.reminders`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        reminders: null
      }
    })
}

function removeContactAssociation(cb) {
  const task_id = results.task.create.data.id
  const association_id = results.task.addContactAssociation.data.id
  return frisby
    .create('delete the contact association from task')
    .delete(`/crm/tasks/${task_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(204)
}

function removeAssociationReturns404OnNotFound(cb) {
  const task_id = results.task.create.data.id
  const association_id = uuid.v4()
  return frisby
    .create('delete a non-existing association returns 404')
    .delete(`/crm/tasks/${task_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(404)
}

function bulkRemoveAssociations(cb) {
  const task_id = results.task.create.data.id
  const ids = [
    results.contact.getContacts.data[2].id,
    results.contact.getContacts.data[3].id
  ]

  return frisby
    .create('delete multiple associations from task')
    .delete(
      `/crm/tasks/${task_id}/associations?ids[]=${ids[0]}&ids[]=${ids[1]}`
    )
    .after(cb)
    .expectStatus(204)
}

function remove(cb) {
  return frisby
    .create('delete a task')
    .delete(`/crm/tasks/${results.task.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureTaskIsDeleted(cb) {
  return frisby
    .create('make sure task is deleted')
    .get('/crm/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', results.task.getAllReturnsAll.data.length - 1)
}

module.exports = {
  registerNewUser,
  addAbbasToBrand,
  getTokenForAbbas,
  create,
  createWithInvalidData,
  createWithInvalidAssociationId,
  getForUser,
  updateTask,
  cloneTask,
  updateAssignee,
  addContactAssociation,
  refreshTaskAssociations,
  addBulkContactAssociations,
  fetchAssociations,
  addInvalidAssociation,
  createAnotherTaskWithRelativeReminder,
  addFixedReminder,
  updateFixedReminder,
  attachFile,
  fetchTaskWithAttachments,
  fetchAttachments,
  makeSureAttachmentIsRemoved,
  getAllReturnsAll,
  orderWorks,
  filterByDueDate,
  getAllDoesntIgnoreFilters,
  getSingleTask,
  stringFilter,
  stringFilterAcceptsMultipleQ,
  substringFilter,
  stringFilterReturnsEmptyWhenNoResults,
  filterByContact,
  filterByAssignee,
  filterByNonExistingAssignee,
  filterByInvalidDealId,
  loginAsAnotherUser,
  createPersonalBrandForNewUser,
  anotherUserCantAccessCreatedTasks,
  anotherUserCantAccessTaskById,
  anotherUserCantFetchAssociations,
  anotherUserCantEditCreatedTasks,
  anotherUserCantAddContactAssociation,
  anotherUserCantRemoveCreatedTasks,
  anotherUserCantRemoveContactAssociation,
  anotherUserCantAttachFile,
  anotherUserCantFetchAttachments,
  anotherUserCantRemoveAttachment,
  removeAttachment,
  removeReminder,
  removeAssociationReturns404OnNotFound,
  removeContactAssociation,
  bulkRemoveAssociations,
  remove,
  makeSureTaskIsDeleted
}
