const agent = require('./mls/agent.js')

registerSuite('office', ['add'])

const add = (cb) => {
  return frisby.create('add an agent')
    .post('/jobs', {
      queue: 'MLS.Agent',
      name: 'mls_agent',
      data: { processed: agent }
    })
    .after(cb)
    .expectStatus(200)
}

const getByMlsId = (cb) => {
  return frisby.create('get an agent by mls id')
    .get(`/agents/search?mlsid=${agent.mlsid}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          mlsid: agent.mlsid,
          first_name: agent.first_name,
          last_name: agent.last_name,
          email: agent.email,
          nrds: agent.nrds
        }
      ]
    })
}

const getById = cb => {
  return frisby.create('get an agent by id')
    .get(`/agents/${results.agent.getByMlsId.data[0].id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.agent.getByMlsId.data[0]
    })
}

const getByOffice = (cb) => {
  return frisby.create('get all agents of an office')
    .get(`/agents/search?officemlsid=${agent.office_mlsid}&mls=${agent.mls}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          mlsid: agent.mlsid,
          first_name: agent.first_name,
          last_name: agent.last_name,
          email: agent.email
        }
      ]
    })
}

const search = (cb) => {
  return frisby.create('search for an agent')
    .get(`/agents/search?q=${agent.first_name}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        mlsid: agent.mlsid,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        mls: agent.mls
      }]
    })
}

const searchByMls = (cb) => {
  return frisby.create('search for an agent limited to an mls')
    .get(`/agents/search?q=${agent.first_name}&mls[]=${agent.mls}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        mlsid: agent.mlsid,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        mls: agent.mls
      }]
    })
}


const searchByMlsInverted = (cb) => {
  return frisby.create('search for an agent limited to an mls that will return no results')
    .get(`/agents/search?q=${agent.first_name}&mls[]=CRMLS`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
      info: {
        count: 0,
        total: 0
      }
    })
}

const report = (cb) => {
  return frisby.create('fetch report')
    .post('/agents/report', {
      criteria: {
        list_volume: {},
        list_value: {},
        sell_volume: {},
        sell_value: {},
        active_volume: {},
        active_value: {},
        total_active_volume: {},
        total_active_value: {},
        total_value: {},
        total_volume: {
          min: 3 // Just to limit the results.
        }
      }
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

module.exports = {
  add,
  getByMlsId,
  getById,
  getByOffice,
  search,
  searchByMls,
  searchByMlsInverted,
  report
}
