var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');

var sql_insert    = require('../sql/agent/insert.sql');

Agent = {};


var schema = {
  type:'object',
  properties: {
    email: {
      type:'string',
    },

    mlsid: {
      type:'string',
    },

    fax: {
      type:'string',
    },

    first_name: {
      type:'string',
      required:true
    },

    last_name: {
      type:'string',
      required:true
    },

    full_name: {
      type:'string',
      required:true
    },

    middle_name: {
      type:'string'
    },

    phone_number: {
      type:'string'
    },

    nar_number: {
      type:'string'
    },

    office_mui: {
      type:'number',
      required:false
    },

    status: {
      type:'string',
      required:true
    },

    office_mlsid: {
      type:'string',
    },

    work_phone: {
      type:'string',
    },

    generational_name: {
      type:'string'
    },

    matrix_unique_id: {
      type:'number',
      required:true
    },

    matrix_modified_dt: {
      type:'string',
      required:true
    }
  }
}

var validate = validator.bind(null, schema);

Agent.create = function(agent, cb) {
  validate(agent, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
        agent.email,
        agent.mlsid,
        agent.fax,
        agent.full_name,
        agent.first_name,
        agent.last_name,
        agent.middle_name,
        agent.phone_number,
        agent.nar_number,
        agent.office_mui,
        agent.status,
        agent.office_mlsid,
        agent.work_phone,
        agent.generational_name,
        agent.matrix_unique_id,
        agent.matrix_modified_dt
    ], cb);
  });
}

module.exports = function(){};