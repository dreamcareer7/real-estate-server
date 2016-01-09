#!/usr/bin/env node

var async   = require('async');
var Client = require('./rets_client.js');

var program = require('./program.js');
var options = program.parse(process.argv);


options.resource = 'Agent';
options.class = 'Agent';
options.processor = processData;

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

  // Triming zeros and invalid characters
  var mlsid = data.MLSID;
  mlsid = ObjectUtil.makeAllNumeric(mlsid);
  mlsid = ObjectUtil.trimLeadingZeros(mlsid);

  agent.email              = data.Email;
  agent.mlsid              = mlsid;
  agent.fax                = data.FaxPhone;
  agent.first_name         = data.FirstName;
  agent.last_name          = data.LastName;
  agent.full_name          = data.FullName;
  agent.middle_name        = data.MiddleName;
  agent.phone_number       = data.CellPhone;
  agent.nar_number         = data.NARNumber;
  agent.office_mui         = data.Office_MUI ? parseInt(data.Office_MUI) : undefined;
  agent.status             = data.AgentStatus;
  agent.office_mlsid       = (data.OfficeMLSID === 'Blank') ? '' : data.OfficeMLSID;
  agent.work_phone         = data.DirectWorkPhone;
  agent.generational_name  = data.GenerationalName;
  agent.matrix_unique_id   = parseInt(data.Matrix_Unique_ID);
  agent.matrix_modified_dt = data.MatrixModifiedDT;

  return agent;
}
