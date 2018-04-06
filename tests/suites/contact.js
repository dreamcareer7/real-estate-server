const _ = require('lodash')
const uuid = require('uuid')
const { contact, companyContact } = require('./data/contact.js')
const manyContacts = require('./data/manyContacts.js')

let defs
const contactAttributes = _.groupBy(contact.attributes, 'type')

function _fixContactAttributeDefs(contact) {
  for (const attr of contact.attributes) {
    attr.attribute_def = defs[attr.type].id
    delete attr.type
  }
}

function getAttributeDefs(cb) {
  return frisby
    .create('get all attribute defs, global or user-defined')
    .get('/contacts/attribute_defs')
    .after(function(err, res, json) {
      defs = _.keyBy(json.data, 'name')

      _fixContactAttributeDefs(contact)
      _fixContactAttributeDefs(companyContact)
      for (const c of manyContacts) {
        _fixContactAttributeDefs(c)
      }

      cb(err, res, json)
    })
    .expectStatus(200)
}

function create(cb) {
  const name =
    contactAttributes.first_name[0].text +
    ' ' +
    contactAttributes.last_name[0].text

  return frisby
    .create('add a contact')
    .post('/contacts?get=true&relax=false&activity=true', {
      contacts: [contact]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [
        {
          sub_contacts: [contact],
          summary: {
            display_name: name
          }
        }
      ]
    })
}

const createCompanyContact = cb => {
  const company_name = companyContact.attributes[0].text
  return frisby
    .create('add a company contact')
    .post('/contacts?get=true&relax=false&activity=true', {
      contacts: [companyContact]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [
        {
          summary: {
            display_name: company_name
          }
        }
      ]
    })
}

const createManyContacts = cb => {
  return frisby
    .create('add many contacts')
    .post('/contacts?get=false&relax=true&activity=false', {
      contacts: manyContacts
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length)
}

const getContacts = cb => {
  return frisby
    .create('get list of contacts and see if the ones we added is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length + 2)
}

const getSingleContact = cb => {
  const id = results.contact.create.data[0].id

  return frisby
    .create('get a single contact')
    .get(`/contacts/${id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: results.contact.create.data[0]
    })
}

const getNonExistingContact = cb => {
  const id = uuid.v4()

  return frisby
    .create('get a non existing contact')
    .get(`/contacts/${id}`)
    .after(cb)
    .expectStatus(404)
}

const getGibberishContact = cb => {
  const id = 123456

  return frisby
    .create('get a gibberish contact')
    .get(`/contacts/${id}`)
    .after(cb)
    .expectStatus(400)
}

const filterContacts = cb => {
  return frisby
    .create('filter contacts by attribute values')
    .post('/contacts/filter', {
      filter: [{
        attribute_def: defs.tag.id,
        text: 'New'
      }, {
        attribute_def: defs.company.id,
        text: 'Rechat'
      }]
    })
    .after(cb)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [{
        id: results.contact.create.data[0].id
      }]
    })
    .expectStatus(200)
}

const filterOnNonExistentAttributeDef = cb => {
  return frisby
    .create('filter contacts by a non-existing attribute def returns empty')
    .post('/contacts/filter', {
      filter: [{
        attribute_def: defs.tag.id,
        text: 'New'
      }, {
        attribute_def: uuid.v4(),
        text: 'Gholi'
      }]
    })
    .after(cb)
    .expectJSONLength('data', 0)
    .expectJSON({
      data: []
    })
    .expectStatus(200)
}

const addAttribute = cb => {
  const a = {
    attribute_def: defs['stage'].id,
    text: 'PastClient'
  }

  return frisby
    .create('add a new attribute')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.sub_contacts[0].attributes, a))
        return cb(err, res, json)

      throw 'Attribute is not added!'
    })
    .expectStatus(200)
}

const addInvalidAttribute = cb => {
  const a = {
    attribute_def: uuid.v4(),
    text: 'BombasticValue'
  }

  return frisby
    .create('add an invalid attribute')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidAttributeValue = cb => {
  const a = {
    attribute_def: defs['stage'].id,
    text: 'BombasticStage'
  }

  return frisby
    .create('add an invalid attribute value')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after(cb)
    .expectStatus(400)
}

const addNullAttributeValue = cb => {
  const a = {
    attribute_def: defs['birthday'].id,
    date: null
  }

  return frisby
    .create('add a null attribute value')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidPhoneNumber = cb => {
  const a = {
    attribute_def: defs['phone_number'].id,
    text: '+123456'
  }

  return frisby
    .create('add an invalid phone number')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after(cb)
    .expectStatus(400)
}

const addPhoneNumber = cb => {
  const a = {
    attribute_def: defs['phone_number'].id,
    text: '+989028202678',
    label: 'mobile',
    is_primary: true
  }

  return frisby
    .create('add a valid phone number')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.sub_contacts[0].attributes, a))
        return cb(err, res, json)

      throw 'Phone number is not added!'
    })
    .expectStatus(200)
}

const addEmail = cb => {
  const a = {
    attribute_def: defs['email'].id,
    label: 'Personal',
    text: 'test+email2@rechat.com'
  }

  return frisby
    .create('add a valid email')
    .post(`/contacts/${results.contact.addPhoneNumber.data.id}/attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.sub_contacts[0].attributes, a))
        return cb(err, res, json)

      throw 'Email is not added!'
    })
    .expectStatus(200)
}

const areEmailsLowered = cb => {
  return frisby
    .create('are emails lowered')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        {
          attribute_def: defs['email'].id,
          text: 'BombasticEmail@MrBombastic.OrG'
        }
      ]
    })
    .expectStatus(200)
    .after((err, res, json) => {
      const email = _(json.data.sub_contacts[0].attributes)
        .filter({ attribute_type: 'email' })
        .sortBy('created_at')
        .last().text

      if (email !== 'bombasticemail@mrbombastic.org')
        throw 'Email is not lowered'

      cb(err, res, json)
    })
}

const arePhoneNumbersProper = cb => {
  return frisby
    .create('are phone numbers proper')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes`, {
      attributes: [
        {
          attribute_def: defs['phone_number'].id,
          text: '09729711191'
        }
      ]
    })
    .expectStatus(200)
    .after((err, res, json) => {
      const phone = _.findLast(json.data.sub_contacts[0].attributes, {
        attribute_type: 'phone_number'
      }).text

      if (phone !== '+19729711191') throw 'Phone number is not properly saved'

      cb(err, res, json)
    })
}

const removeAttribute = cb => {
  const attr_id = _.findLast(
    results.contact.addAttribute.data.sub_contacts[0].attributes,
    {
      attribute_type: 'stage'
    }
  ).id

  return frisby
    .create('remove the latest added attribute')
    .delete(
      `/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`
    )
    .after((err, res, json) => {
      const phone = _.findLast(json.data.sub_contacts[0].attributes, {
        id: attr_id
      })

      if (phone) throw 'Attribute is not removed.'

      cb(err, res, json)
    })
    .expectStatus(200)
}

const removeNonExistingAttribute = cb => {
  const attr_id = uuid.v4()

  return frisby
    .create('remove a non-existing attribute')
    .delete(
      `/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`
    )
    .after(cb)
    .expectStatus(404)
}

const removeGibberishAttribute = cb => {
  const attr_id = 123456

  return frisby
    .create('remove a gibberish attribute')
    .delete(
      `/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}`
    )
    .after(cb)
    .expectStatus(400)
}

const deleteContact = cb => {
  return frisby
    .create('delete a contact')
    .delete('/contacts/' + results.contact.create.data[0].id)
    .expectStatus(204)
    .after(cb)
}

const deleteManyContacts = cb => {
  const ids = _(results.contact.createManyContacts.data)
    .take(2)
    .map(cid => `ids[]=${cid}`)
    .join('&')

  return frisby
    .create('delete multiple contacts')
    .delete('/contacts/?' + ids)
    .expectStatus(204)
    .after(cb)
}

const deleteContactWorked = cb => {
  const before_count = results.contact.getContacts.info.count

  return frisby
    .create('get list of contacts and make sure delete contact was successful')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: before_count - 3
      }
    })
}

const updateContact = cb => {
  const stages = _.filter(
    results.contact.addAttribute.data.sub_contacts[0].attributes,
    { attribute_type: 'stage' }
  )
  const phones = _.filter(
    results.contact.addPhoneNumber.data.sub_contacts[0].attributes,
    { attribute_type: 'phone_number' }
  )
  const emails = _.filter(
    results.contact.addEmail.data.sub_contacts[0].attributes,
    { attribute_type: 'email' }
  )

  const stage = stages[stages.length - 1]
  const phone = phones[phones.length - 1]
  const email = emails[emails.length - 1]

  stage.text = 'Customer'
  phone.text = '+989028202679'
  phone.label = 'Home-Line1'
  phone.is_primary = true
  email.text = 'test+email3@rechat.com'
  emails[0].is_primary = true

  delete stage.updated_at
  delete phone.updated_at
  delete email.updated_at

  return frisby
    .create('update a contact')
    .patch('/contacts/' + results.contact.create.data[0].id, {
      attributes: [stage, phone, email]
    })
    .after((err, res, json) => {
      const attrs = [
        _.find(json.data.sub_contacts[0].attributes, stage),
        _.find(json.data.sub_contacts[0].attributes, phone),
        _.find(json.data.sub_contacts[0].attributes, email)
      ]
      if (!attrs.every(x => Boolean(x))) throw 'Attributes are not updated.'

      cb(err, res, json)
    })
    .expectStatus(200)
}

const updateManyContacts = cb => {
  const contacts = results.contact.createManyContacts.data.map(cid => {
    return {
      id: cid,
      attributes: [{
        attribute_def: defs.tag.id,
        text: 'ManyContacts'
      }]
    }
  })
  return frisby
    .create('add a tag attribute to many contacts')
    .patch('/contacts', {
      contacts
    })
    .after((err, res, json) => {
      for (const contact of json.data) {
        const tags = contact.sub_contacts[0].attributes
          .filter(a => a.attribute_def === defs.tag.id)
          .map(a => a.text)

        if (!tags.includes('ManyContacts')) throw 'Tag attributes are not added.'
      }

      cb(err, res, json)
    })
    .expectStatus(200)
}

const getTimeline = (cb) => {
  return frisby.create('get list of contact activities (timeline)')
    .get(`/contacts/${results.contact.create.data[0].id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 1,
        total: 1
      }
    })
}

const getAllTags = (cb) => {
  return frisby.create('get all Tags')
    .get('/contacts/tags')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 3)
    .expectJSON({
      code: 'OK'
    })
}

module.exports = {
  getAttributeDefs,
  create,
  createManyContacts,
  createCompanyContact,
  getContacts,
  getSingleContact,
  getNonExistingContact,
  getGibberishContact,
  filterContacts,
  filterOnNonExistentAttributeDef,
  addAttribute,
  addInvalidAttribute,
  addNullAttributeValue,
  addInvalidPhoneNumber,
  addPhoneNumber,
  addEmail,
  areEmailsLowered,
  arePhoneNumbersProper,
  updateContact,
  updateManyContacts,
  getTimeline,
  getAllTags,
  removeAttribute,
  removeNonExistingAttribute,
  removeGibberishAttribute,
  deleteContact,
  deleteManyContacts,
  deleteContactWorked,
}
