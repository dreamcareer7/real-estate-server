registerSuite('user', ['create'])
registerSuite('listing', ['by_mui'])
registerSuite('listing', ['getListing'])

const _u = require('lodash')
const uuid = require('uuid')
const contact_response = require('./expected_objects/contact.js')
const info_response = require('./expected_objects/info.js')
const contact = require('./data/contact.js')

const create = (cb) => {
  return frisby.create('add a contact')
    .post('/contacts', {
      contacts: [
        contact
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [
        {
          sub_contacts: [
            contact
          ]
        }
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    })
}

const addAttribute = (cb) => {
  const o = _u.cloneDeep(contact)

  const a = {
    type: 'stage',
    stage: 'PastClient'
  }

  o.attributes.stages.push(a)

  return frisby.create('add a new attribute')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        a
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data:
      {
        sub_contacts: [
          o
        ]
      }
    })
}

const addInvalidAttribute = (cb) => {
  const a = {
    type: 'bombastic',
    stage: 'BombasticValue'
  }

  return frisby.create('add an invalid attribute')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        a
      ]
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidAttributeValue = (cb) => {
  const a = {
    type: 'stage',
    stage: 'BombasticStage'
  }

  return frisby.create('add an invalid attribute value')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        a
      ]
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidPhoneNumber = (cb) => {
  const a = {
    type: 'phone_number',
    phone_number: '+123456'
  }

  return frisby.create('add an invalid phone number')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        a
      ]
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidEmail = (cb) => {
  const a = {
    type: 'email',
    email: 'BombasticEmail@'
  }

  return frisby.create('add an invalid email')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        a
      ]
    })
    .after(cb)
    .expectStatus(400)
}

const areEmailsLowered = (cb) => {
  return frisby.create('are emails lowered')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        {
          type: 'email',
          email: 'BombasticEmail@MrBombastic.OrG'
        }
      ]
    })
    .expectStatus(200)
    .after((err, res, json) => {
      const email = json.data.sub_contacts[0].attributes.emails[1].email

      if(email !== 'bombasticemail@mrbombastic.org')
        throw 'Email is not lowered'

      cb(err, res, json)
    })
}

const arePhoneNumbersProper = (cb) => {
  return frisby.create('are phone numbers proper')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        {
          type: 'phone_number',
          phone_number: '09729711191'
        }
      ]
    })
    .expectStatus(200)
    .after((err, res, json) => {
      const phone = json.data.sub_contacts[0].attributes.phone_numbers[1].phone_number

      if(phone !== '+19729711191')
        throw 'Phone number is not properly saved'

      cb(err, res, json)
    })
}

const removeAttribute = (cb) => {
  const stages = results.contact.addAttribute.data.sub_contacts[0].attributes.stages
  const attr_id = stages[stages.length - 1].id

  return frisby.create('remove the latest added attribute')
    .delete(`/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data:
      {
        sub_contacts: [
          contact
        ]
      }
    })
}

const removeNonExistingAttribute = (cb) => {
  const attr_id = uuid.v1()

  return frisby.create('remove a non-existing attribute')
    .delete(`/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`)
    .after(cb)
    .expectStatus(404)
}

const removeGibberishAttribute = (cb) => {
  const attr_id = 123456

  return frisby.create('remove a gibberish attribute')
    .delete(`/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`)
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByAction = (cb) => {
  return frisby.create('record an activity by invalid action')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'BombasticActivity',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByActionForUser = (cb) => {
  return frisby.create('record an activity by invalid action for a user')
    .post('/users/self/timeline', {
      action: 'BombasticActivity',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByType = (cb) => {
  return frisby.create('record an activity by invalid type')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'bombastic_call',
      object: {
        type: 'bombastic_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByTypeForUser = (cb) => {
  return frisby.create('record an activity by invalid type for a user')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'bombastic_call',
      object: {
        type: 'bombastic_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityActionMissing = (cb) => {
  return frisby.create('record an invalid activity when action is missing')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      object_class: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityActionMissingForUser = (cb) => {
  return frisby.create('record an invalid activity when action is missing for a user')
    .post('/users/self/timeline', {
      object_class: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectClassMissing = (cb) => {
  return frisby.create('record an invalid activity when object class is missing')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectClassMissingForUser = (cb) => {
  return frisby.create('record an invalid activity when object class is missing for a user')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectMissing = (cb) => {
  return frisby.create('record an invalid activity when object is missing')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'phone_call',
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectMissingForUser = (cb) => {
  return frisby.create('record an invalid activity when object is missing for a user')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'phone_call',
    })
    .after(cb)
    .expectStatus(400)
}

const addActivityToNonExistingContact = (cb) => {
  const id = uuid.v1()

  return frisby.create('recording an activity for non-existing contact')
    .post(`/contacts/${id}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(404)
}

const addActivityToGibberishContact = (cb) => {
  const id = 123456

  return frisby.create('record an activity for gibberish contact id')
    .post(`/contacts/${id}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addActivityObject = (cb) => {
  return frisby.create('record activity for contact by object')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'UserViewedListing',
      object_class: 'listing',
      object: results.listing.getListing.data.id
    })
    .after(cb)
    .expectStatus(200)
}

const addActivityObjectForUser = (cb) => {
  return frisby.create('record activity for contact by object for a user')
    .post('/users/self/timeline', {
      action: 'UserViewedListing',
      object_class: 'listing',
      object: results.listing.getListing.data.id
    })
    .after(cb)
    .expectStatus(200)
}

const addActivityReference = (cb) => {
  return frisby.create('record activity for contact by reference')
    .post(`/contacts/${results.contact.create.data[0].id}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(200)
}

const addActivityReferenceForUser = (cb) => {
  return frisby.create('record activity for contact by reference for a user')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(200)
}

const addActivityToRoomObject = (cb) => {
  return frisby.create('record activity for a room by object')
    .post(`/rooms/${results.user.create.data.personal_room}/timeline`, {
      action: 'UserCalledContact',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(200)
}

const addActivityToRoomReference = (cb) => {
  return frisby.create('record activity for a room by reference')
    .post(`/rooms/${results.user.create.data.personal_room}/timeline`, {
      action: 'UserViewedListing',
      object_class: 'listing',
      object: results.listing.getListing.data.id
    })
    .after(cb)
    .expectStatus(200)
}

const getTimeline = (cb) => {
  return frisby.create('get list of contact activities (timeline)')
    .get(`/contacts/${results.contact.create.data[0].id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {
        count: 4,
        total: 4
      }
    })
}

const getTimelineForUser = (cb) => {
  return frisby.create('get list of contact activities (timeline) for a user')
    .get(`/users/${results.authorize.token.data.id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {
        count: 4,
        total: 4
      }
    })
}

const getContacts = (cb) => {
  results.user.create.data.type = 'compact_user'

  return frisby.create('get list of contacts and see if the one we added is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {}
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    })
}

const getNonExistingContact = (cb) => {
  const id = uuid.v1()

  return frisby.create('get a non existing')
    .get(`/contacts/${id}`)
    .after(cb)
    .expectStatus(404)
}

const getGibberishContact = (cb) => {
  const id = 123456

  return frisby.create('get a gibberish contact')
    .get(`/contacts/${id}`)
    .after(cb)
    .expectStatus(400)
}

const search = (cb) => {
  results.user.create.data.type = 'compact_user'

  return frisby.create('search contacts and see if the one we added is there')
    .get('/contacts/search?q[]=' + results.user.create.data.first_name)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    })
}

const getByTag = (cb) => {
  return frisby.create('filter contacts by tags')
    .get('/contacts?tags[]=foo&tags[]=bar')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteContact = (cb) => {
  return frisby.create('delete a contact')
    .delete('/contacts/' + results.contact.create.data[0].id)
    .expectStatus(204)
    .after(cb)
}

const deleteContactWorked = (cb) => {
  const before_count = results.contact.getContacts.info.count

  return frisby.create('get list of contacts and make sure delete contact was successful')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: before_count - 1
      }
    })
}
const getAllTags = (cb) => {
  return frisby.create('get all Tags')
    .get('/contacts/tags')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const updateContact = (cb) => {
  return frisby.create('update a contact')
    .patch('/contacts/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String
    })
}

module.exports = {
  create,
  getContacts,
  getNonExistingContact,
  getGibberishContact,
  getByTag,
  search,
  addAttribute,
  removeAttribute,
  areEmailsLowered,
  arePhoneNumbersProper,
  addInvalidAttribute,
  addInvalidAttributeValue,
  addInvalidPhoneNumber,
  addInvalidEmail,
  removeNonExistingAttribute,
  removeGibberishAttribute,
  addInvalidActivityByType,
  addInvalidActivityByTypeForUser,
  addInvalidActivityByAction,
  addInvalidActivityByActionForUser,
  addInvalidActivityActionMissing,
  addInvalidActivityActionMissingForUser,
  addInvalidActivityObjectClassMissing,
  addInvalidActivityObjectClassMissingForUser,
  addInvalidActivityObjectMissing,
  addInvalidActivityObjectMissingForUser,
  addActivityToNonExistingContact,
  addActivityToGibberishContact,
  addActivityObject,
  addActivityObjectForUser,
  addActivityReference,
  addActivityReferenceForUser,
  addActivityToRoomObject,
  addActivityToRoomReference,
  getTimeline,
  getTimelineForUser,
  deleteContact,
  deleteContactWorked,
  getAllTags,
  updateContact
}
