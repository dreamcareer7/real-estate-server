registerSuite('user', ['create'])
registerSuite('listing', ['by_mui'])

// const uuid = require('node-uuid')
const contact_response = require('./expected_objects/contact.js')
const info_response = require('./expected_objects/info.js')
const contact = require('./data/contact.js')

const create = (cb) => {
  // contact.attributes.address = [
  //   results.listing.by_mui.data.address
  // ]
  //
  contact.attributes.names = [
    {
      type: 'name',
      first_name: results.user.create.data.first_name,
      last_name: results.user.create.data.last_name
    }
  ]

  contact.phone_numbers = [
    {
      type: 'phone_number',
      phone_number: results.user.create.data.phone_number
    }
  ]

  contact.emails = [
    {
      type: 'email',
      email: results.user.create.data.email
    }
  ]

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
      code: 'OK',
      data: [
        {
          sub_contacts: [
            {
              attributes: {
                names: [
                  {
                    type: 'name',
                    first_name: 'John',
                    last_name: 'Doe'
                  }
                ],
                tags: [
                  {
                    type: 'tag',
                    tag: 'New'
                  }
                ]
              }
            }
          ],
          type: 'contact'
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

const create400 = (cb) => {
  return frisby.create('expect 400 with empty model when creating a contact')
    .post('/contacts')
    .after(cb)
    .expectStatus(400)
}

const getContact = (cb) => {
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
  const before_count = results.contact.getContact.info.count

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

module.exports = {
  create,
  create400,
  getContact,
  getByTag,
  search,
  deleteContact,
  deleteContactWorked
}
