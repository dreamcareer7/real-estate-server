const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const uuid = require('node-uuid')
const FormData = require('form-data')

const config = require('../../lib/config.js')
const { touch } = require('./data/touch')
const anotherUser = require('./data/user')

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])
registerSuite('contact', ['getAttributeDefs', 'create', 'createManyContacts'])
registerSuite('listing', ['by_mui'])

function fixResponseTouchToInput(touch) {
  if (touch.contact)
    touch.contact = touch.contact.id
  if (touch.deal)
    touch.deal = touch.deal.id
  if (touch.listing)
    touch.listing = touch.listing.id
  if (touch.assignee)
    delete touch.assignee
}

function create(cb) {
  const data = Object.assign({}, touch, {
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

  return frisby.create('create a touch')
    .post('/crm/touches?associations[]=touch.associations', data)
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

  return frisby.create('create a touch fails without all required fields')
    .post('/crm/touches', data)
    .after(cb)
    .expectStatus(400)
}

function createWithInvalidAssociationId(cb) {
  const data = Object.assign({}, touch, {
    associations: [{
      association_type: 'contact',
      contact: '123123'
    }]
  })

  return frisby.create('create a touch fails with invalid contact id')
    .post('/crm/touches', data)
    .after(cb)
    .expectStatus(400)
}

function getForUser(cb) {
  return frisby.create('get list of touches')
    .get('/crm/touches/')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

function updateTouch(cb) {
  const new_timestamp = new Date().getTime() / 1000 - 3600
  return frisby.create('update timestamp of a touch')
    .put('/crm/touches/' + results.touch.create.data.id, Object.assign({}, touch, {
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
    .post(`/crm/touches/${results.touch.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        association_type: 'contact',
        touch: results.touch.create.data.id,
        contact: {
          id: results.contact.create.data[0].id
        }
      }
    })
}

function checkContactTimeline(cb) {
  const contact_id = results.contact.create.data[0].id
  const updated_touch = _.omit(results.touch.updateTouch.data, [
    'created_at',
    'updated_at',
  ])

  return frisby.create('associated touch appears in contact timeline')
    .get(`/contacts/${contact_id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [
        {
          type: 'contact_attribute'
        },
        updated_touch
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
    .post(`/crm/touches/${results.touch.create.data.id}/associations/bulk?associations[]=crm_association.contact`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        association_type: 'contact',
        touch: results.touch.create.data.id,
        contact: {
          id: results.contact.createManyContacts.data[0]
        }
      }, {
        association_type: 'contact',
        touch: results.touch.create.data.id,
        contact: {
          id: results.contact.createManyContacts.data[1]
        }
      }]
    })
}

function fetchAssociations(cb) {
  return frisby.create('fetch actual associated objects')
    .get(`/crm/touches/${results.touch.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        type: 'crm_association',
        touch: results.touch.create.data.id,
        association_type: 'listing',
        listing: {
          type: 'listing',
          id: results.listing.by_mui.data.id
        }
      }, {
        type: 'crm_association',
        touch: results.touch.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.create.data[0].id,
          type: 'contact',
          users: undefined,
          deals: undefined
        }
      }, {
        type: 'crm_association',
        touch: results.touch.create.data.id,
        association_type: 'contact',
        contact: {
          id: results.contact.createManyContacts.data[0],
          type: 'contact',
          users: undefined,
          deals: undefined
        }
      }, {
        type: 'crm_association',
        touch: results.touch.create.data.id,
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
    .post(`/crm/touches/${results.touch.create.data.id}/associations?associations[]=touch.associations`, data)
    .after(cb)
    .expectStatus(400)
}

function unsetDescription(cb) {
  const data = Object.assign({}, results.touch.updateTouch.data)
  delete data.description

  fixResponseTouchToInput(data)

  return frisby.create('unset touch description')
    .put(`/crm/touches/${results.touch.create.data.id}`, data)
    .after(cb)
    .expectJSON({
      data: {
        description: undefined
      }
    })
    .expectStatus(200)
}

function attachFile(cb) {
  const touch_id = results.touch.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  const data = new FormData()
  data.append('file', logo)

  return frisby
    .create('attach file to a touch')
    .post(`/crm/touches/${touch_id}/files?associations[]=touch.files`, {
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

function fetchTouchWithAttachments(cb) {
  const touch_id = results.touch.create.data.id

  return frisby
    .create('get touch with attachments')
    .get(`/crm/touches/${touch_id}?associations[]=touch.files`)
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
  const touch_id = results.touch.create.data.id
  
  return frisby
    .create('get touch attachmets')
    .get(`/crm/touches/${touch_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        name: 'logo.png'
      }]
    })
}

function createAnotherTouch(cb) {
  const data = Object.assign({}, touch, {
    description: 'Another touch',
  })

  return frisby.create('create another touch')
    .post('/crm/touches', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data
    })
}

function getAllReturnsAll(cb) {
  return frisby.create('make sure we get everything without filters')
    .get('/crm/touches?associations[]=touch.associations')
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
    .get('/crm/touches?order=-timestamp')
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

function getSingleTouch(cb) {
  return frisby.create('make sure get a single touch by id works')
    .get(`/crm/touches/${results.touch.create.data.id}?associations[]=touch.associations`)
    .after(cb)
    .expectJSON({
      data: {
        id: results.touch.create.data.id
      }
    })
    .expectStatus(200)
}

function getAllDoesntIgnoreFilters(cb) {
  return frisby.create('make sure filters are not ignored')
    .get(`/crm/touches/search/?contact=${uuid.v4()}`)
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
  return frisby.create('filter touches by due date')
    .get(`/crm/touches/search/?due_gte=${results.touch.create.data.created_at - 2}`)
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
  return frisby.create('string search in touches')
    .get('/crm/touches/search/?q[]=Hello&start=0&limit=10&associations[]=touch.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.touch.create.data.id,
        description: touch.description
      }]
    })
    .expectJSONLength('data', 1)
}

function stringFilterAcceptsMultipleQ(cb) {
  return frisby.create('string search accepts multiple q arguments')
    .get('/crm/touches/search/?q[]=Hello&q[]=World&start=0&limit=10&associations[]=touch.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.touch.create.data.id,
        description: touch.description
      }]
    })
    .expectJSONLength('data', 1)
}

function substringFilter(cb) {
  return frisby.create('partial string search in touches')
    .get('/crm/touches/search/?q[]=Wor&start=0&limit=10&associations[]=touch.associations')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        id: results.touch.create.data.id,
        description: touch.description
      }]
    })
    .expectJSONLength('data', 1)
}

function stringFilterReturnsEmptyWhenNoResults(cb) {
  return frisby.create('string search in touches returns empty array when no touches are found')
    .get('/crm/touches/search/?q=Goodbye&start=0&limit=10&associations[]=touch.associations')
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
  return frisby.create('get touches related to a contact')
    .get(`/crm/touches/search/?contact=${results.contact.create.data[0].id}&start=0&limit=10&associations[]=touch.associations`)
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
  return frisby.create('filtering touches fails with an invalid deal id')
    .get('/crm/touches/search/?deal=123456')
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

function anotherUserCantAccessCreatedtouches(cb) {
  return frisby.create('another user cannot access touches for the original user')
    .get('/crm/touches?associations[]=touch.associations')
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function anotherUserCantAccessTouchById(cb) {
  return frisby.create('another user cannot access a single touch by id')
    .get(`/crm/touches/${results.touch.create.data.id}?associations[]=touch.associations`)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAssociations(cb) {
  return frisby.create('another user cannot fetch touch associations')
    .get(`/crm/touches/${results.touch.create.data.id}/associations?associations[]=crm_association.listing&associations[]=crm_association.contact`)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantEditCreatedtouches(cb) {
  return frisby.create('another user cannot update touches for the original user')
    .put('/crm/touches/' + results.touch.create.data.id, Object.assign({}, touch, {
      timestamp: new Date().getTime() / 1000
    }))
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantAddContactAssociation(cb) {
  const data = {
    association_type: 'contact',
    contact: results.contact.create.data[0].id
  }

  return frisby.create('another user cannot add a contact association')
    .post(`/crm/touches/${results.touch.create.data.id}/associations?associations[]=crm_association.contact`, data)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveCreatedtouches(cb) {
  return frisby.create('another user cannot remove touches for the original user')
    .delete(`/crm/touches/${results.touch.create.data.id}`)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantRemoveContactAssociation(cb) {
  const touch_id = results.touch.create.data.id
  const association_id = results.touch.addContactAssociation.data.id
  return frisby.create('another user cannot delete the contact association from touch')
    .delete(`/crm/touches/${touch_id}/associations/${association_id}?associations[]=touch.associations`)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}


function anotherUserCantAttachFile(cb) {
  const touch_id = results.touch.create.data.id
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  const data = new FormData()
  data.append('file', logo)

  return frisby
    .create('another user cannot attach a file to a touch')
    .post(`/crm/touches/${touch_id}/files?associations[]=touch.files`, {
      file: logo
    }, {
      json: false,
      form: true
    })
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(404)
}

function anotherUserCantFetchAttachments(cb) {
  const touch_id = results.touch.create.data.id
  
  return frisby
    .create('another user cannot get touch attachmets')
    .get(`/crm/touches/${touch_id}/files`)
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
  const touch_id = results.touch.create.data.id
  const file_id = results.touch.fetchAttachments.data[0].id

  return frisby
    .create('another user cannot remove a touch attachment')
    .delete(`/crm/touches/${touch_id}/files/${file_id}`)
    .addHeader('Authorization', 'Bearer ' + results.touch.loginAsAnotherUser.access_token)
    .after(cb)
    .expectStatus(404)
}

function removeAttachment(cb) {
  const touch_id = results.touch.create.data.id
  const file_id = results.touch.fetchAttachments.data[0].id

  return frisby
    .create('remove a touch attachment')
    .delete(`/crm/touches/${touch_id}/files/${file_id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureAttachmentIsRemoved(cb) {
  const touch_id = results.touch.create.data.id
  
  return frisby
    .create('make sure attachment is remove')
    .get(`/crm/touches/${touch_id}/files`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

function removeContactAssociation(cb) {
  const touch_id = results.touch.create.data.id
  const association_id = results.touch.addContactAssociation.data.id
  return frisby.create('delete the contact association from touch')
    .delete(`/crm/touches/${touch_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(204)
}

function removeAssociationReturns404OnNotFound(cb) {
  const touch_id = results.touch.create.data.id
  const association_id = uuid.v4()
  return frisby.create('delete a non-existing association returns 404')
    .delete(`/crm/touches/${touch_id}/associations/${association_id}`)
    .after(cb)
    .expectStatus(404)
}

function bulkRemoveAssociations(cb) {
  const touch_id = results.touch.create.data.id
  const ids = [
    results.contact.createManyContacts.data[0],
    results.contact.createManyContacts.data[1]
  ]

  return frisby.create('delete multiple associations from touch')
    .delete(`/crm/touches/${touch_id}/associations?ids[]=${ids[0]}&ids[]=${ids[1]}`)
    .after(cb)
    .expectStatus(204)
}

function remove(cb) {
  return frisby.create('delete a touch')
    .delete(`/crm/touches/${results.touch.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function makeSureTouchIsDeleted(cb) {
  return frisby.create('make sure touch is deleted')
    .get('/crm/touches')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', results.touch.getAllReturnsAll.data.length - 1)
}

module.exports = {
  create,
  createWithInvalidData,
  createWithInvalidAssociationId,
  getForUser,
  updateTouch,
  addContactAssociation,
  checkContactTimeline,
  addBulkContactAssociations,
  fetchAssociations,
  addInvalidAssociation,
  createAnotherTouch,
  attachFile,
  fetchTouchWithAttachments,
  fetchAttachments,
  makeSureAttachmentIsRemoved,
  getAllReturnsAll,
  orderWorks,
  filterByDueDate,
  getAllDoesntIgnoreFilters,
  getSingleTouch,
  stringFilter,
  stringFilterAcceptsMultipleQ,
  substringFilter,
  stringFilterReturnsEmptyWhenNoResults,
  filterByContact,
  filterByInvalidDealId,
  unsetDescription,
  loginAsAnotherUser,
  anotherUserCantAccessCreatedtouches,
  anotherUserCantAccessTouchById,
  anotherUserCantFetchAssociations,
  anotherUserCantEditCreatedtouches,
  anotherUserCantAddContactAssociation,
  anotherUserCantRemoveCreatedtouches,
  anotherUserCantRemoveContactAssociation,
  anotherUserCantAttachFile,
  anotherUserCantFetchAttachments,
  anotherUserCantRemoveAttachment,
  removeAttachment,
  removeAssociationReturns404OnNotFound,
  removeContactAssociation,
  bulkRemoveAssociations,
  remove,
  makeSureTouchIsDeleted,
}