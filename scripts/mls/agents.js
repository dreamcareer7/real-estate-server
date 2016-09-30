#!/usr/bin/env node

const async = require('async')
const Client = require('./rets_client.js')

const program = require('./program.js')
const options = program.parse(process.argv)

options.resource = 'Agent'
options.class = 'Agent'
options.processor = processData
options.job = 'agents'

Client.work(options, report)

function processData (cb, results) {
  async.mapLimit(results.mls, 100, insertAgent, cb)
}

function insertAgent (data, cb) {
  Metric.increment('mls.processed_agent')

  const agent = populate(data)

  Agent.create(agent, cb)
}

function report (err) {
  if (err)
    console.log(err)

  process.exit()
}

function populate (data) {
  const agent = {}

  agent.email = data.Email || undefined
  agent.mlsid = data.MLSID
  agent.fax = data.FaxPhone || undefined
  agent.first_name = data.FirstName || undefined
  agent.last_name = data.LastName || undefined
  agent.full_name = data.FullName || undefined
  agent.middle_name = data.MiddleName || undefined
  agent.phone_number = data.CellPhone || undefined
  agent.nar_number = data.NARNumber || undefined
  agent.office_mui = data.Office_MUI ? parseInt(data.Office_MUI) : undefined
  agent.status = data.AgentStatus || undefined
  agent.office_mlsid = (data.OfficeMLSID === 'Blank') ? '' : data.OfficeMLSID
  agent.work_phone = data.DirectWorkPhone || undefined
  agent.generational_name = data.GenerationalName || undefined
  agent.matrix_unique_id = parseInt(data.Matrix_Unique_ID)
  agent.matrix_modified_dt = data.MatrixModifiedDT

  return agent
}
