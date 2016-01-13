#!/usr/bin/env node

var async   = require('async');
var Client = require('./rets_client.js');

var program = require('./program.js');
var options = program.parse(process.argv);


options.resource = 'Agent';
options.class = 'Agent';
options.processor = processData;
options.job = 'agents';

Client.work(options, report);

function processData(cb, results) {
  async.mapLimit(results.mls, 100, insertAgent, cb);
}

function insertAgent(data, cb) {
  Metric.increment('mls.processed_agent');

  var agent = populate(data);

  Agent.create(agent, cb);
}

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}

function populate(data) {
  var agent = {};

  agent.email              = data.Email || null;
  agent.mlsid              = data.MLSID;
  agent.fax                = data.FaxPhone || null;
  agent.first_name         = data.FirstName || null;
  agent.last_name          = data.LastName || null;
  agent.full_name          = data.FullName || null;
  agent.middle_name        = data.MiddleName || null;
  agent.phone_number       = data.CellPhone || null;
  agent.nar_number         = data.NARNumber || null;
  agent.office_mui         = data.Office_MUI ? parseInt(data.Office_MUI) : null;
  agent.status             = data.AgentStatus || null;
  agent.office_mlsid       = (data.OfficeMLSID === 'Blank') ? '' : data.OfficeMLSID;
  agent.work_phone         = data.DirectWorkPhone || null;
  agent.generational_name  = data.GenerationalName || null;
  agent.matrix_unique_id   = parseInt(data.Matrix_Unique_ID);
  agent.matrix_modified_dt = data.MatrixModifiedDT;

  return agent;
}
