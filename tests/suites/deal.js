const {deal, address, full_address} = require('./data/deal.js')
const deal_response = require('./expected_objects/deal.js')

registerSuite('listing', ['getListing'])
registerSuite('form', ['create'])

const create = (cb) => {
  const data = JSON.parse(JSON.stringify(deal))
  data.listing = results.listing.getListing.data.id

  return frisby.create('create a deal')
    .post('/deals', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: deal
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const createHippocket = cb => {
  const data = JSON.parse(JSON.stringify(deal))
  data.context.full_address = full_address

  return frisby.create('create a hippocket deal')
    .post('/deals', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        context: address
      }
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const addRole = cb => {
  const role = {
    first_name: 'Imaginary',
    last_name: 'Lawyer',
    email: 'imaginary_lawyer@rechat.com',
    role: 'Lawyer'
  }

  results.deal.create.data.roles = [
    {
      type: 'deal_role',
      role: role.role,
      user: {
        first_name: role.first_name,
        last_name: role.last_name,
        email: role.email
      }
    }
  ]

  return frisby.create('add a role to a deal')
    .post(`/deals/${results.deal.create.data.id}/roles`, role)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.create.data
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const getAll = (cb) => {
  return frisby.create('get user\'s deals')
    .get('/deals')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.deal.createHippocket.data, results.deal.create.data]
    })
}


const get = (cb) => {
  return frisby.create('get a deal')
    .get(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.deal.create.data
    })
    .expectJSONTypes({
      code: String,
      data: deal_response
    })
}

const remove = (cb) => {
  return frisby.create('delete a deal')
    .delete(`/deals/${results.deal.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  create,
  createHippocket,
  addRole,
  get,
  getAll,
  remove
}
