const criteria = require('./data/alert_criteria.js')
const vcriteria = require('./data/valert_criteria.js')
const alert_response = require('./expected_objects/alert.js')
const info = require('./expected_objects/info.js')
const compact_listing = require('./expected_objects/compact_listing.js')
const uuid = require('uuid')
registerSuite('room', ['create', 'addUser'])
registerSuite('agent', ['add'])
registerSuite('mls', ['addListing'])


const maximum_price = 100000

const create = (cb) => {
  criteria.created_by = results.room.create.data.owner
  criteria.room = results.room.create.data.id
  return frisby.create('create alert')
    .post('/rooms/' + results.room.create.data.id + '/alerts', criteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: criteria
    })
    .expectJSONTypes('data', alert_response)
}

const feed = (cb) => {
  return frisby.create('get feed')
    .get('/rooms/' + results.room.create.data.id + '/recs/feed')
    .after((err, res, json) => {
      const c = new Set(json.data.map(r => r.created_at))
      const u = new Set(json.data.map(r => r.updated_at))

      if (Math.min(c.size, u.size) < json.data.length)
        throw 'Recommendation date timestamps are equal!'

      cb(err, res, json)
    })
    .expectStatus(200)
}

const get = cb => {
  return frisby.create('get alert by id')
    .get(`/alerts/${results.alert.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: criteria
    })
    .expectJSONTypes('data', alert_response)
}

const search = cb => {
  return frisby.create('search in user alerts')
    .get('/alerts/search?q[]=Test')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [criteria],
      info: {
        count: 1
      }
    })
    .expectJSONTypes('data', [alert_response])
}

const getUserAlerts = (cb) => {
  return frisby.create('get user alerts and make sure create alert was successful')
    .get('/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    }).expectJSON({
      code: 'OK',
      data: [
        {
          id: results.alert.create.data.id,
          created_by: {
            type: 'user',
            id: results.room.create.data.owner.id
          }
        }
      ]
    })
    .expectJSONTypes({
      data: [alert_response],
      info: info
    })
}

const getRoomAlerts = (cb) => {
  return frisby.create('get room alerts and make sure create alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          id: results.alert.create.data.id,
          created_by: {
            type: 'user',
            id: results.room.create.data.owner.id
          },
          room: results.room.create.data.id
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      'data': [alert_response],
      info: info
    })
}

const patchAlert = (cb) => {
  return frisby.create('patch alert')
    .put('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id, {
      maximum_price: maximum_price
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes('data', alert_response)
}

const patchAlert404 = (cb) => {
  return frisby.create('expect 404 with invalid alert id when updating an alert')
    .put('/rooms/' + results.alert.create.data.room + '/alerts/' + uuid.v1(), {
      maximum_price: maximum_price
    })
    .after(cb)
    .expectStatus(404)
}

const patchAlertWorked = (cb) => {
  return frisby.create('make sure patch alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          maximum_price: maximum_price
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONTypes('data', [alert_response])
    .expectJSONLength('data', 1)
}

const virtual = (cb) => {
  return frisby.create('virtual alert')
    .post('/valerts', vcriteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'compact_listing'
        }
      ]
    })
    .expectJSONTypes({
      'data': [compact_listing],
      info: info
    })
}

const virtualCount = (cb) => {
  return frisby.create('count a virtual alert')
    .post('/valerts/count', vcriteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
    .expectJSONTypes({
      info: {
        total: results.alert.virtual.info.count
      }
    })
}

const virtualByAgent = (cb) => {
  const criteria = {
    property_types: vcriteria.property_types,
    property_subtypes: vcriteria.property_subtypes,
    agents: [
      results.agent.getByMlsId.data[0].id
    ]
  }

  return frisby.create('get a list of listings of an agent')
    .post('/valerts', criteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      info
    })
}

const deleteAlert = (cb) => {
  return frisby.create('delete alert')
    .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id)
    .after(cb)
    .expectStatus(204)
}

const deleteAlert404 = (cb) => {
  return frisby.create('expect 404 with invalid alert id when deleting an alert')
    .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const deleteAlertWorked = (cb) => {
  return frisby.create('make sure delete alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 0
      }
    })
    .expectJSONLength('data', 0)
}

function updateAlertSetting(cb) {
  return frisby.create('Update alert setting')
    .patch('/alerts/' + results.alert.create.data.id + '/status', {
      status: ['AlertHit', 'AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop']
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

function invalidUpdateAlertSetting(cb) {
  return frisby.create('Update alert setting with invalid status should not work')
    .patch('/alerts/' + results.alert.create.data.id + '/status', {
      status: ['AlertHittt', 'AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop']
    })
    .after(cb)
    .expectStatus(500)
}

const listingsAgents = (cb) => {
  return frisby.create('listings agents')
    .post('/listings/filter/agents', vcriteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

const createDistributionList = (cb) => {
  return frisby.create('create distribution list')
    .post('/distributionList', { 
      email: 'test@test.com',
      first_name: 'hossein',
      last_name: 'derakhshan',
      title: 'agent khubu',
      city: 'shiraz',
      state: 'fars',
      postal_code: '123456',
      country: 'Iran',
      phone: 'sorry Im not that guy',
      mls: 'NTREIS'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const getDistributionList = (cb) => {
  return frisby.create('get distribution list')
    .post('/listings/filter/agents', { postal_codes: ['123456'], mls: 'NTREIS' })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
}

module.exports = {
  create,
  feed,
  get,
  search,
  getUserAlerts,
  getRoomAlerts,
  patchAlert,
  patchAlert404,
  patchAlertWorked,
  virtual,
  virtualCount,
  virtualByAgent,
  deleteAlert404,
  deleteAlert,
  deleteAlertWorked,
  updateAlertSetting,
  listingsAgents,
  invalidUpdateAlertSetting,
  createDistributionList,
  getDistributionList
}
