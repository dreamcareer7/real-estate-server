const agent = require('./mls/agent.js')

registerSuite('mls', ['addOffice', 'addAgent', 'regreshAgents'])

const getByMlsId = (cb) => {
  return frisby.create('get an agent by mls id')
    .get(`/agents/search?mlsid=${agent.mlsid}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        mlsid: agent.mlsid,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email
      }
    })
}

const getById = cb => {
  return frisby.create('get an agent by id')
    .get(`/agents/${results.agent.getByMlsId.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.agent.getByMlsId.data
    })
}

const getByOffice = (cb) => {
  return frisby.create('get all agents of an office')
    .get(`/agents/search?officemlsid=${agent.office_mlsid}`)
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
        email: agent.email
      }]
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
  getByMlsId,
  getById,
  getByOffice,
  search,
  report
}
