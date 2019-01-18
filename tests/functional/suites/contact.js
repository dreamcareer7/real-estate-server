const _ = require('lodash')
const uuid = require('uuid')
const { contact, companyContact } = require('./data/contact.js')
const manyContacts = require('./data/manyContacts.js')
const brand = require('./data/brand.js')

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])

let defs

function _fixContactAttributeDefs(contact) {
  contact.user = results.authorize.token.data.id
  for (const attr of contact.attributes) {
    attr.attribute_def = defs[attr.attribute_type].id
    delete attr.attribute_type
  }
}

const brandCreateParent = (cb) => {
  brand.name = 'Parent Brand'
  brand.role = 'Admin' // We're admin of this one

  return frisby.create('create a brand')
    .post('/brands', brand)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const brandCreate = (cb) => {
  brand.parent = results.contact.brandCreateParent.data.id
  brand.name = 'Brand'
  brand.role = 'Agent'

  return frisby.create('create a child brand')
    .post('/brands?associations[]=brand.roles', brand)
    .after((err, res, body) => {
      const setup = frisby.globalSetup()

      setup.request.headers['X-RECHAT-BRAND'] = body.data.id
      setup.request.headers['x-handle-jobs'] = 'yes'

      frisby.globalSetup(setup)
      cb(err, res, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
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
        c.user = results.authorize.token.data.id
        _fixContactAttributeDefs(c)
      }

      cb(err, res, json)
    })
    .expectStatus(200)
}

function create(cb) {
  return frisby
    .create('add a contact')
    .post('/contacts?get=true&relax=false&activity=true&associations[]=contact_attribute.attribute_def&associations[]=contact.attributes&associations[]=contact.summary', {
      contacts: [contact]
    })
    .addHeader('x-handle-jobs', 'yes')
    .after((err, res, json) => {
      for (const attr of contact.attributes) {
        if (!json.data[0].attributes.find(a => a.attribute_def.id === attr.attribute_def))
          throw `Attribute ${attr.type} is not added to the contact.`
      }

      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [
        {
          type: 'contact'
        }
      ]
    })
}

const createCompanyContact = cb => {
  const company_name = companyContact.attributes[0].text
  return frisby
    .create('add a company contact')
    .post('/contacts?get=true&relax=false&activity=true&associations[]=contact.summary', {
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

const createSingleAttrContact = cb => {
  const c = {
    attributes: [{
      attribute_type: 'birthday',
      date: Date.now() / 1000
    }]
  }

  _fixContactAttributeDefs(c)

  return frisby
    .create('add a single attribute contact')
    .post('/contacts?get=true&relax=false&activity=true&associations[]=contact.summary', {
      contacts: [c]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [
        {
          summary: {
            display_name: 'Guest'
          }
        }
      ]
    })
}

const stringSearchForGuest = cb => {
  return frisby
    .create('search for Guest contacts')
    .post('/contacts/filter?q[]=Guest')
    .after(cb)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [{
        id: results.contact.createSingleAttrContact.data[0].id
      }]
    })
    .expectStatus(200)
}

const removeSingleAttrContact = cb => {
  return frisby
    .create('delete single attr contact')
    .delete(`/contacts/${results.contact.createSingleAttrContact.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

const importManyContacts = cb => {
  return frisby
    .create('trigger import many contacts from json')
    .post('/contacts/import.json', {
      contacts: manyContacts
    })
    .after(cb)
    .expectStatus(200)
}

const createEmptyContactFails = cb => {
  return frisby
    .create('creating an empty contact fails')
    .post('/contacts', {
      contacts: [{}]
    })
    .after(cb)
    .expectStatus(400)
}

const getContacts = cb => {
  return frisby
    .create('get list of contacts and see if the ones we added is there')
    .get('/contacts?order=created_at')
    .after((err, res, json) => {
      for (let i = 0; i < json.data.length - 1; i++) {
        if (json.data[i].created_at > json.data[i + 1].created_at) {
          throw 'Contacts are not sorted by created_at'
        }
      }
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length + 2)
}

const getSingleContact = cb => {
  const id = results.contact.create.data[0].id

  return frisby
    .create('get a single contact')
    .get(`/contacts/${id}?associations[]=contact_attribute.attribute_def&associations[]=contact.attributes&associations[]=contact.summary `)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...results.contact.create.data[0],
        display_name: 'John Doe',
        partner_name: 'Jane Doe',
        sort_field: 'Doe John'
      }
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
        value: 'New'
      }, {
        attribute_def: defs.company.id,
        value: 'Rechat'
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

const filterContactsHavingTwoTags = cb => {
  return frisby
    .create('filter by contact attributes using all operator')
    .post('/contacts/filter', {
      filter: [{
        attribute_def: defs.tag.id,
        value: 'New'
      }, {
        attribute_def: defs.tag.id,
        value: 'foo'
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

const invertedFilter = cb => {
  return frisby
    .create('filter by contact attributes using invert option')
    .post('/contacts/filter', {
      filter: [{
        attribute_def: defs.tag.id,
        value: 'New',
        invert: true
      }, {
        attribute_type: 'tag',
        value: 'foo',
        invert: true
      }]
    })
    .after(cb)
    .expectJSONLength('data', manyContacts.length + 1)
    .expectStatus(200)
}

const stringSearch = cb => {
  return frisby
    .create('search in contacts by search terms')
    .post('/contacts/filter?q[]=' + encodeURIComponent('kate-bell@mac.com'))
    .after(cb)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [{
        id: results.contact.getContacts.data[2].id
      }]
    })
    .expectStatus(200)
}

const stringSearchInBody = cb => {
  return frisby
    .create('search in contacts by search terms sent in request body')
    .post('/contacts/filter', {
      query: 'kate-bell@mac.com'
    })
    .after(cb)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [{
        id: results.contact.getContacts.data[2].id
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
    .expectStatus(400)
}

const addAttribute = cb => {
  const a = {
    attribute_def: defs['tag'].id,
    text: 'PastClient'
  }

  return frisby
    .create('add a new attribute')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes?associations[]=contact_attribute.attribute_def&associations[]=contact.attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.attributes, {
        attribute_type: 'tag',
        text: a.text
      }))
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

const addPhoneNumber = cb => {
  const a = {
    attribute_def: defs['phone_number'].id,
    text: '+989028202678',
    label: 'mobile',
    is_primary: true
  }

  return frisby
    .create('add a valid phone number')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes?associations[]=contact.attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.attributes, {
        text: a.text,
        label: a.label,
        is_primary: a.is_primary,
        attribute_type: 'phone_number'
      }))
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
    .post(`/contacts/${results.contact.addPhoneNumber.data.id}/attributes?associations[]=contact.attributes`, {
      attributes: [a]
    })
    .after((err, res, json) => {
      if (_.find(json.data.attributes, {
        text: a.text,
        label: a.label,
        attribute_type: 'email'
      }))
        return cb(err, res, json)

      throw 'Email is not added!'
    })
    .expectStatus(200)
}

const searchByAddedEmail = cb => {
  return frisby
    .create('search in contacts for the added email')
    .post('/contacts/filter?q[]=' + encodeURIComponent('test+email2@rechat.com'))
    .after(cb)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: [{
        id: results.contact.addPhoneNumber.data.id
      }]
    })
    .expectStatus(200)
}

const areEmailsLowered = cb => {
  return frisby
    .create('are emails lowered')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes?associations[]=contact.attributes`, {
      attributes: [
        {
          attribute_def: defs['email'].id,
          text: 'BombasticEmail@MrBombastic.OrG'
        }
      ]
    })
    .expectStatus(200)
    .after((err, res, json) => {
      if (!_.find(json.data.attributes, {
        attribute_type: 'email',
        text: 'bombasticemail@mrbombastic.org'
      }))
        throw 'Email is not lowered'

      cb(err, res, json)
    })
}

const removeAttribute = cb => {
  const attr_id = _.findLast(
    results.contact.addAttribute.data.attributes,
    {
      attribute_type: 'tag'
    }
  ).id

  return frisby
    .create('remove the latest added attribute')
    .delete(
      `/contacts/${results.contact.create.data[0].id}/attributes/${attr_id}?associations[]=contact.attributes`
    )
    .after((err, res, json) => {
      const phone = _.findLast(json.data.attributes, {
        id: attr_id
      })

      if (phone) throw 'Attribute is not removed.'

      cb(err, res, json)
    })
    .expectStatus(200)
}

const removeEmail = cb => {
  const attr_id = _.findLast(
    results.contact.addEmail.data.attributes,
    {
      attribute_type: 'email'
    }
  ).id

  return frisby
    .create('remove the latest added email')
    .after(cb)
    .delete(
      `/contacts/${results.contact.addEmail.data.id}/attributes/${attr_id}`
    )
    .expectStatus(200)
}

const searchByRemovedEmail = cb => {
  return frisby
    .create('search in contacts for the removed email returns empty')
    .post('/contacts/filter?q[]=' + encodeURIComponent('test+email2@rechat.com'))
    .after(cb)
    .expectJSONLength('data', 0)
    .expectJSON({
      data: []
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
  const ids = results.contact.getDuplicateClusters.data.map(cl => cl.contacts[0].id)

  return frisby
    .create('delete multiple contacts')
    .delete('/contacts', { ids })
    .expectStatus(204)
    .after(cb)
}

function checkIfManyContactsListIsEmpty(cb) {
  return frisby.create('check if many contacts list members are actually gone')
    .get('/contacts/lists/' + results.contact.createManyContactsList.data)
    .after(cb)
    .expectJSON({
      data: {
        member_count: manyContacts.length - 2 - results.contact.getDuplicateClusters.data.reduce((s, cl) => s + cl.contacts.length, 0)
      }
    })
    .expectStatus(200)
}

const deleteContactWorked = cb => {
  const before_count = results.contact.getContacts.info.count

  return frisby
    .create('get list of contacts and make sure delete contact was successful')
    .get('/contacts?associations[]=contact.attributes&associations[]=contact.lists')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', before_count - 3 - 4)
    .expectJSON({
      code: 'OK',
    })
}

const updateContact = cb => {
  const tags = _.filter(
    results.contact.addAttribute.data.attributes,
    { attribute_type: 'tag' }
  )
  const phones = _.filter(
    results.contact.addPhoneNumber.data.attributes,
    { attribute_type: 'phone_number' }
  )
  const emails = _.filter(
    results.contact.addEmail.data.attributes,
    { attribute_type: 'email' }
  )

  const tag = tags[tags.length - 1]
  const phone = phones[phones.length - 1]
  const email = emails[emails.length - 1]

  delete tag.attribute_def
  delete phone.attribute_def
  delete email.attribute_def

  tag.text = 'General'
  phone.text = '+989028202679'
  phone.label = 'Home-Line1'
  phone.is_primary = true
  email.text = 'test+email3@rechat.com'
  emails[0].is_primary = true

  delete tag.updated_at
  delete phone.updated_at
  delete email.updated_at

  delete tag.updated_by
  delete phone.updated_by
  delete email.updated_by

  return frisby
    .create('update a contact')
    .patch('/contacts/' + results.contact.create.data[0].id + '?associations[]=contact.attributes', {
      attributes: [tag, phone, email]
    })
    .after((err, res, json) => {
      const attrs = [
        _.find(json.data.attributes, tag),
        _.find(json.data.attributes, phone),
        _.find(json.data.attributes, email)
      ]

      if (!attrs.every(x => Boolean(x))) throw 'Attributes are not updated.'

      cb(err, res, json)
    })
    .expectStatus(200)
}

function createStageLists(cb) {
  return frisby.create('create stage lists')
    .post('/jobs', {
      name: 'contact_lists',
      data: {
        type: 'create_default_lists',
        brand_id: results.contact.brandCreate.data.id
      }
    })
    .after(cb)
    .expectStatus(200)
}

function moveContactToWarmListStage(cb) {
  return frisby
    .create('change contact stage to warm list')
    .patch('/contacts/' + results.contact.create.data[0].id, {
      attributes: [{
        attribute_type: 'tag',
        text: 'Warm List'
      }]
    })
    .after(cb)
    .expectStatus(200)
}

function patchOwner(cb) {
  return frisby
    .create('change contact owner')
    .patch('/contacts/' + results.contact.create.data[0].id, {
      user: results.authorize.token.data.id
    })
    .after(cb)
    .expectStatus(200)
}

function contactShouldBeInWarmList(cb) {
  return frisby.create('check if contact is a member of warm list')
    .get('/contacts/' + results.contact.create.data[0].id + '?associations[]=contact.lists')
    .after(cb)
    .expectJSON({
      data: {
        lists: [{
          name: 'Warm List'
        }]
      }
    })
}

function deleteWarmList(cb) {
  return frisby.create('delete warm list')
    .delete('/contacts/lists/' + results.contact.createStageLists[0])
    .after(cb)
    .expectStatus(204)
}

function confirmNoContactListMembership(cb) {
  return frisby.create('check if contact does not belong to warm list anymore')
    .get('/contacts/' + results.contact.create.data[0].id + '?associations[]=contact.lists')
    .after(cb)
    .expectJSON({
      data: {
        lists: null
      }
    })
}

const updateManyContacts = cb => {
  return frisby
    .create('add a tag attribute to many contacts')
    .patch('/contacts?get=true&associations[]=contact.attributes', {
      contacts: results.contact.getContacts.data.slice(2).map(c => ({
        id: c.id,
        attributes: [{
          attribute_def: defs.tag.id,
          text: 'ManyContacts'
        }]
      }))
    })
    .after(cb)
    .expectStatus(200)
}

function makeSureManyContactsTagIsAdded(cb) {
  return frisby
    .create('make sure ManyContacts tag is added to all')
    .post('/contacts/filter', {
      filter: [{
        attribute_def: defs.tag.id,
        value: 'ManyContacts'
      }]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length)
}

function createManyContactsList(cb) {
  return frisby.create('create many contacts list')
    .post('/contacts/lists', {
      filters: [
        {
          attribute_def: defs.tag.id,
          value: 'ManyContacts'
        }
      ],
      args: {
        users: [results.authorize.token.data.id]
      },
      'name': 'Many Contacts',
      touch_freq: 7
    })
    .after(cb)
    .expectStatus(200)
}

function getManyContactsList(cb) {
  return frisby.create('get many contacts list')
    .get('/contacts/lists/' + results.contact.createManyContactsList.data)
    .after(cb)
    .expectJSON({
      data: {
        member_count: manyContacts.length
      }
    })
    .expectStatus(200)
}

function getContactsInManyContactsList(cb) {
  return frisby
    .create('get list of contacts in many contacts list')
    .get('/contacts?associations[]=contact.lists&list=' + results.contact.createManyContactsList.data)
    .after((err, res, json) => {
      if (!json.data.every(c => Boolean(c.next_touch)))
        throw 'Next touch is not set on ManyContacts list members'
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length)
}

function unsetTouchFreqOnManyContactsList(cb) {
  return frisby.create('unset touch frequency of many contacts list')
    .put('/contacts/lists/' + results.contact.createManyContactsList.data, {
      filters: [
        {
          attribute_def: defs.tag.id,
          value: 'ManyContacts'
        }
      ],
      'name': 'Many Contacts',
      touch_freq: null,
      is_pinned: false
    })
    .after(cb)
    .expectStatus(200)
}

function checkIfNextTouchIsNull(cb) {
  return frisby
    .create('check if next_touch is cleared on many contacts')
    .get('/contacts?associations[]=contact.lists&list=' + results.contact.createManyContactsList.data)
    .after((err, res, json) => {
      if (json.data.some(c => Boolean(c.next_touch)))
        throw 'Next touch is not null on ManyContacts list members'
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSONLength('data', manyContacts.length)
}

const getTimeline = (cb) => {
  return frisby.create('get list of contact activities (timeline)')
    .get(`/contacts/${results.contact.create.data[0].id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        type: 'contact_attribute',
        attribute_type: 'note'
      }],
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
    .expectJSONLength('data', 5)
    .expectJSON({
      code: 'OK'
    })
}

const renameTag = (cb) => {
  return frisby.create('rename foo tag to bar')
    .patch('/contacts/tags/foo', {
      tag: 'bar'
    })
    .after(cb)
    .expectStatus(204)
}

const verifyTagRenamed = cb => {
  return frisby.create('verify that tag is renamed')
    .get('/contacts/tags')
    .after((err, res, body) => {
      const tags = body.data.map(a => a.text)

      if (!tags.includes('bar') || tags.length !== 5) {
        throw 'Tag was not renamed correctly.'
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

const deleteTag = (cb) => {
  return frisby.create('delete bar tag')
    .delete('/contacts/tags/bar')
    .after(cb)
    .expectStatus(204)
}

const verifyTagDeleted = cb => {
  return frisby.create('verify that tag is deleted')
    .get('/contacts/tags')
    .after((err, res, body) => {
      const tags = body.data.map(a => a.text)

      if (tags.includes('bar') || tags.length !== 4) {
        throw 'Tag was not deleted correctly.'
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

const getDuplicateClusters = cb => {
  return frisby.create('get the list of duplicate clusters')
    .get('/contacts/duplicates')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 2)
}

const getContactDuplicates = cb => {
  const id = results.contact.getDuplicateClusters.data[0].contacts[0].id

  return frisby.create('get contact duplicates')
    .get(`/contacts/${id}/duplicates`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        type: 'contact_duplicate',
        contacts: [{
          id
        }]
      }
    })
}

const mergeContacts = cb => {
  const sub_contacts = results.contact.getContacts.data.slice(2, 4).map(c => c.id)
  const parent_id = results.contact.getContacts.data[4].id

  return frisby.create('merge contacts')
    .post(`/contacts/${parent_id}/merge?associations[]=contact.attributes`, {
      sub_contacts
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        id: parent_id
      }
    })
}

const bulkMerge = cb => {
  return frisby
    .create('merge two clusters of duplicate contacts')
    .post('/contacts/merge', {
      clusters: results.contact.getDuplicateClusters.data.map(cl => {
        return {
          parent: cl.contacts[0].id,
          sub_contacts: cl.contacts.slice(1).map(c => c.id)
        }
      })
    })
    .after(cb)
    .expectStatus(200)
}

const getJobStatus = cb => {
  return frisby
    .create('get status of a contact-related job')
    .get('/contacts/jobs/' + results.contact.bulkMerge.data.job_id)
    .after(cb)
    .expectStatus(200)
}

const sendEmails = cb => {
  const campaign = {
    subject: 'Email Subject',
    to: [{ email: 'recipient@rechat.com' }],
    html: '<div>HTML Body</div>',
    text: 'Text Body',
    from: results.authorize.token.data.id
  }

  return frisby
    .create('send emails to contacts')
    .post('/contacts/emails', campaign)
    .after(cb)
    .expectStatus(200)
}

const sendEmailsToTag = cb => {
  const campaign = {
    subject: 'Email Subject',
    html: '<div>HTML Body</div>',
    text: 'Text Body',
    to: [{ tag: 'ManyContacts' }],
    from: results.authorize.token.data.id
  }


  return frisby
    .create('send emails to contacts with ManyContacts tag')
    .post('/contacts/emails', campaign)
    .after(cb)
    .expectStatus(200)
}

const sendEmailsToList = cb => {
  const campaign = {
    subject: 'Email Subject',
    html: '<div>HTML Body</div>',
    text: 'Text Body',
    to: [{
      list: results.contact.createManyContactsList.data
    }],
    from: results.authorize.token.data.id
  }

  return frisby
    .create('send emails to many contacts list')
    .post('/contacts/emails', campaign)
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  brandCreateParent,
  brandCreate,
  getAttributeDefs,
  create,
  createCompanyContact,
  createSingleAttrContact,
  stringSearchForGuest,
  removeSingleAttrContact,
  importManyContacts,
  createEmptyContactFails,
  getContacts,
  getSingleContact,
  getNonExistingContact,
  getGibberishContact,
  filterContacts,
  filterContactsHavingTwoTags,
  invertedFilter,
  stringSearch,
  stringSearchInBody,
  filterOnNonExistentAttributeDef,
  addAttribute,
  addInvalidAttribute,
  addNullAttributeValue,
  addPhoneNumber,
  addEmail,
  searchByAddedEmail,
  areEmailsLowered,
  updateContact,
  patchOwner,
  createStageLists,
  moveContactToWarmListStage,
  contactShouldBeInWarmList,
  deleteWarmList,
  confirmNoContactListMembership,
  updateManyContacts,
  makeSureManyContactsTagIsAdded,
  sendEmailsToTag,
  createManyContactsList,
  getManyContactsList,
  sendEmailsToList,
  getContactsInManyContactsList,
  unsetTouchFreqOnManyContactsList,
  checkIfNextTouchIsNull,
  getTimeline,
  getAllTags,
  renameTag,
  verifyTagRenamed,
  deleteTag,
  verifyTagDeleted,
  removeAttribute,
  removeEmail,
  searchByRemovedEmail,
  removeNonExistingAttribute,
  removeGibberishAttribute,
  getDuplicateClusters,
  getContactDuplicates,
  mergeContacts,
  bulkMerge,
  getJobStatus,
  deleteContact,
  deleteManyContacts,
  checkIfManyContactsListIsEmpty,
  deleteContactWorked,
  sendEmails
}
