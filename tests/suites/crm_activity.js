const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const uuid = require('node-uuid')
const FormData = require('form-data')

const config = require('../../lib/config.js')
const { activity } = require('./data/crm_activity')
const anotherUser = require('./data/user')

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])
registerSuite('contact', ['getAttributeDefs', 'create', 'createManyContacts'])
registerSuite('listing', ['by_mui'])

function fixResponseActivityToInput(activity) {
  if (activity.contact)
    activity.contact = activity.contact.id
  if (activity.deal)
    activity.deal = activity.deal.id
  if (activity.listing)
    activity.listing = activity.listing.id
  if (activity.assignee)
    delete activity.assignee
}

function create(cb) {
  const data = Object.assign({}, activity, {
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

  return frisby.create('create an activity')
    .post('/crm/activities?associations[]=crm_activity.associations', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: expected
    })
}

function createWithInvalidData(cb) {
  const data = Object.assign({
    timestamp: Date.now() + 3600
  })

  return frisby.create('create an activity fails without all required fields')
    .post('/crm/activities', data)
    .after(cb)
    .expectStatus(400)
}

function createWithInvalidAssociationId(cb) {
  const data = Object.assign({}, activity, {
    associations: [{
      association_type: 'contact',
      contact: '123123'
    }]
  })

  return frisby.create('create an activity fails with invalid contact id')
    .post('/crm/activities', data)
    .after(cb)
    .expectStatus(400)
}

function getForUser(cb) {
  return frisby.create('get list of activity logs')
    .get('/crm/activities/')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function updateActivity(cb) {
  const new_timestamp = new Date().getTime() / 1000 - 3600
  return frisby.create('update timestamp of an activity')
    .put('/crm/activities/' + results.crm_activity.create.data.id, Object.assign({}, activity, {
      timestamp: new_timestamp,
      outcome: 'Wrong number'
    }))
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        timestamp: new_timestamp,
        outcome: 'Wrong number'
      }
    })
}

function addContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby.create('add a contact association')
    .post(`/crm/activities/${results.crm_activity.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        association_type: 'contact',
        crm_activity: results.crm_activity.create.data.id,
        contact: {
          id: results.contact.create.data[0].id
        }
      }
    })
}

function checkContactTimeline(cb) {
  const contact_id = results.contact.create.data[0].id
  const updated_activity = _.omit(results.crm_activity.updateActivity.data, [
    'created_at',
    'updated_at',
  ])

  return frisby.create('associated activity appears in contact timeline')
    .get(`/contacts/${contact_id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          action: 'UserSignedUp',
          type: 'activity'
        },
        updated_activity
      ]
    })
}

function addBulkContactAssociations(cb) {
  const data = [{
    association_type: 'contact',
    contact: results.contact.createManyContacts.data[0]
  }, {
    association_type: 'contact',
    contact: results.contact.createManyContacts.data[1]
  }]

  return frisby.create('add multiple contact associations')
    .post(`/crm/activities/${results.crm_activity.create.data.id}/associations/bulk?associations[]=crm_association.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        association_type: 'contact',
        crm_activity: results.crm_activity.create.data.id,
        contact: {
          id: results.contact.createManyContacts.data[0]
        }
      }, {
        association_type: 'contact',
        crm_activity: results.crm_activity.create.data.id,
        contact: {
          id: results.contact.createManyContacts.data[1]
        }
      }]
    })
}

function fetchAssociations(cb) {
  return frisby.create('fetch actual associated objects')
    .get(`/crm/activities/${results.crm_activity.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        type: 'crm_association',
        crm_activity: results.crm_activity.create.data.id,
        association_type: 'listing',
        listing: {
          type: 'listing',
          id: results.listing.by_mui.data.id
        }
      }, {
        type: 'crm_association',
        crm_activity: results.crm_activity.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.create.data[0].id,
          type: 'contact',
          users: undefined,
          deals: undefined
        }
      }, {
        type: 'crm_association',
        crm_activity: results.crm_activity.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.createManyContacts.data[0],
          type: 'contact',
          users: undefined,
          deals: undefined
        }
      }, {
        type: 'crm_association',
        crm_activity: results.crm_activity.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.createManyContacts.data[1],
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
    .post(`/crm/activities/${results.crm_activity.create.data.id}/associations?associations[]=crm_activity.associations`, data)
    .after(cb)
    .expectStatus(400)
}

function unsetDescription(cb) {
  const data = Object.assign({}, results.crm_activity.updateActivity.data)
  delete data.description

  fixResponseActivityToInput(data)

  return frisby.create('unset activity description')
    .put(`/crm/activities/${results.crm_activity.create.data.id}`, data)
    .after(cb)
    .expectJSON({
      data: {
        description: undefined
      }
    })
    .expectStatus(200)
}

function attachFile(cb) {
  const activity_id = results.crm_activity.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  const data = new FormData()
  data.append('file', logo)

  return frisby
    .create('attach file to an activity')
    .post(`/crm/activities/${activity_id}/files?associations[]=crm_activity.files`, {
      file: logo
    }, {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

function fetchActivityWithAttachments(cb) {
  const activity_id = results.crm_activity.create.data.id

  return frisby
    .create('get activity with attachments')
    .get(`/crm/activities/${activity_id}?associations[]=crm_activity.files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        files: [{
          name: 'logo.png'
        }]
      }
    })
}

function fetchAttachments(cb) {
  const activity_id = results.crm_activity.create.data.id
  
  return frisby
    .create('get activity attachmets')
    .get(`/crm/activities/${activity_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        name: 'logo.png'
      }]
    })
}

function createAnotherActivity(cb) {
  const data = Object.assign({}, activity, {
    description: 'Another activity log',
  })

  return frisby.create('create another activity')
    .post('/crm/activities', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data
    })
}

function getAllReturnsAll(cb) {
  return frisby.create('make sure we get everything without filters')
    .get('/crm/activities?associations[]=crm_activity.associations')
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
  return frisby.create('make sure order by timestamp works')
    .get('/crm/activities?order=-timestamp')
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

function getSingleActivity(cb) {
  return frisby.create('make sure get a single activity by id works')
    .get(`/crm/activities/${results.crm_activity.create.data.id}?associations[]=crm_activity.associations`)
    .after(cb)
    .expectJSON({
      data: {
        id: results.crm_activity.create.data.id
      }
    })
    .expectStatus(200)
}

function getAllDoesntIgnoreFilters(cb) {
  return frisby.create('make sure filters are not ignored')
    .get(`/crm/activities/search/?contact=${uuid.v4()}`)
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
  return frisby.create('filter activities by due date')
    .get(`/crm/activities/search/?due_gte=${results.crm_activity.create.data.created_at - 2}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info: {
        total: 2
      }
    })
    .expectJSONLength('data', 2)
}

function stringFilter(cb) {
  return frisby.create('string search in activities')
    .get('/crm/activities/search/?q[]=Hello&start=0&limit=10&associations[]=crm_activity.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.crm_activity.create.data.id,
        description: activity.description
      }]
    })
    .expectJSONLength('data', 1)
}

function stringFilterAcceptsMultipleQ(cb) {
  return frisby.create('string search accepts multiple q arguments')
    .get('/crm/activities/search/?q[]=Hello&q[]=World&start=0&limit=10&associations[]=crm_activity.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.crm_activity.create.data.id,
        description: activity.description
      }]
    })
    .expectJSONLength('data', 1)
}

function substringFilter(cb) {
  return frisby.create('partial string search in activities')
    .get('/crm/activities/search/?q[]=Wor&start=0&limit=10&associations[]=crm_activity.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.crm_activity.create.data.id,
        description: activity.description
      }]
    })
    .expectJSONLength('data', 1)
}

function stringFilterReturnsEmptyWhenNoResults(cb) {
  return frisby.create('string search in activities returns empty array when no activities are found')
    .get('/crm/activities/search/?q=Goodbye&start=0&limit=10&associations[]=crm_activity.associations')
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
  return frisby.create('get activities related to a contact')
    .get(`/crm/activities/search/?contact=${results.contact.create.data[0].id}&start=0&limit=10&associations[]=crm_activity.associations`)
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
  return frisby.create('filtering activities fails with an invalid deal id')
    .get('/crm/activities/search/?deal=123456')
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

function anotherUserCantAccessCreatedActivities(cb) {
  return frisby.create('another user cannot access activities for the original user')
    .get('/crm/activities?associations[]=crm_activity.associations')
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function anotherUserCantAccessActivityById(cb) {
  return frisby.create('another user cannot access a single activity by id')
    .get(`/crm/activities/${results.crm_activity.create.data.id}?associations[]=crm_activity.associations`)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAssociations(cb) {
  return frisby.create('another user cannot fetch activity associations')
    .get(`/crm/activities/${results.crm_activity.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantEditCreatedActivities(cb) {
  return frisby.create('another user cannot update activities for the original user')
    .put('/crm/activities/' + results.crm_activity.create.data.id, Object.assign({}, activity, {
      timestamp: new Date().getTime() / 1000
    }))
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantAddContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby.create('another user cannot add a contact association')
    .post(`/crm/activities/${results.crm_activity.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveCreatedActivities(cb) {
  return frisby.create('another user cannot remove activities for the original user')
    .delete(`/crm/activities/${results.crm_activity.create.data.id}`)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveContactAssociation(cb) {
  const activity_id = results.crm_activity.create.data.id
  const association_id = results.crm_activity.addContactAssociation.data.id
  return frisby.create('another user cannot delete the contact association from activity')
    .delete(`/crm/activities/${activity_id}/associations/${association_id}?associations[]=crm_activity.associations`)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}


function anotherUserCantAttachFile(cb) {
  const activity_id = results.crm_activity.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  const data = new FormData()
  data.append('file', logo)

  return frisby
    .create('another user cannot attach a file to an activity')
    .post(`/crm/activities/${activity_id}/files?associations[]=crm_activity.files`, {
      file: logo
    }, {
      json: false,
      form: true
    })
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAttachments(cb) {
  const activity_id = results.crm_activity.create.data.id
  
  return frisby
    .create('another user cannot get activity attachmets')
    .get(`/crm/activities/${activity_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        name: 'logo.png'
      }]
    })
}

function anotherUserCantRemoveAttachment(cb) {
  const activity_id = results.crm_activity.create.data.id
  const file_id = results.crm_activity.fetchAttachments.data[0].id

  return frisby
    .create('another user cannot remove an activity attachment')
    .delete(`/crm/activities/${activity_id}/files/${file_id}`)
    .addHeader('Authorization', 'Bearer ' + results.crm_activity.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function removeAttachment(cb) {
  const activity_id = results.crm_activity.create.data.id
  const file_id = results.crm_activity.fetchAttachments.data[0].id

  return frisby
    .create('remove an activity attachment')
    .delete(`/crm/activities/${activity_id}/files/${file_id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureAttachmentIsRemoved(cb) {
  const activity_id = results.crm_activity.create.data.id
  
  return frisby
    .create('make sure attachment is remove')
    .get(`/crm/activities/${activity_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

function removeContactAssociation(cb) {
  const activity_id = results.crm_activity.create.data.id
  const association_id = results.crm_activity.addContactAssociation.data.id
  return frisby.create('delete the contact association from activity')
    .delete(`/crm/activities/${activity_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(204)
}

function removeAssociationReturns404OnNotFound(cb) {
  const activity_id = results.crm_activity.create.data.id
  const association_id = uuid.v4()
  return frisby.create('delete a non-existing association returns 404')
    .delete(`/crm/activities/${activity_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(404)
}

function bulkRemoveAssociations(cb) {
  const activity_id = results.crm_activity.create.data.id
  const ids = [
    results.contact.createManyContacts.data[0],
    results.contact.createManyContacts.data[1]
  ]

  return frisby.create('delete multiple associations from activity')
    .delete(`/crm/activities/${activity_id}/associations?ids[]=${ids[0]}&ids[]=${ids[1]}`)
    .after(cb)
    .expectStatus(204)
}

function remove(cb) {
  return frisby.create('delete an activity')
    .delete(`/crm/activities/${results.crm_activity.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureActivityIsDeleted(cb) {
  return frisby.create('make sure activity is deleted')
    .get('/crm/activities')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', results.crm_activity.getAllReturnsAll.data.length - 1)
}

module.exports = {
  create,
  createWithInvalidData,
  createWithInvalidAssociationId,
  getForUser,
  updateActivity,
  addContactAssociation,
  checkContactTimeline,
  addBulkContactAssociations,
  fetchAssociations,
  addInvalidAssociation,
  createAnotherActivity,
  attachFile,
  fetchActivityWithAttachments,
  fetchAttachments,
  makeSureAttachmentIsRemoved,
  getAllReturnsAll,
  orderWorks,
  filterByDueDate,
  getAllDoesntIgnoreFilters,
  getSingleActivity,
  stringFilter,
  stringFilterAcceptsMultipleQ,
  substringFilter,
  stringFilterReturnsEmptyWhenNoResults,
  filterByContact,
  filterByInvalidDealId,
  unsetDescription,
  loginAsAnotherUser,
  anotherUserCantAccessCreatedActivities,
  anotherUserCantAccessActivityById,
  anotherUserCantFetchAssociations,
  anotherUserCantEditCreatedActivities,
  anotherUserCantAddContactAssociation,
  anotherUserCantRemoveCreatedActivities,
  anotherUserCantRemoveContactAssociation,
  anotherUserCantAttachFile,
  anotherUserCantFetchAttachments,
  anotherUserCantRemoveAttachment,
  removeAttachment,
  removeAssociationReturns404OnNotFound,
  removeContactAssociation,
  bulkRemoveAssociations,
  remove,
  makeSureActivityIsDeleted,
}