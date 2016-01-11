var async          = require('async');

var db             = require('../utils/db.js');
var validator      = require('../utils/validator.js');

var sql_insert     = require('../sql/agent/insert.sql');
var sql_get        = require('../sql/agent/get.sql');
var sql_get_by_email        = require('../sql/agent/get_by_email.sql');
var sql_search     = require('../sql/agent/search.sql');
var sql_office_mls = require('../sql/agent/office_mls.sql');

Agent = {};

var schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string'
    },

    mlsid: {
      type: 'string'
    },

    fax: {
      type: 'string'
    },

    first_name: {
      type: 'string',
      required: true
    },

    last_name: {
      type: 'string',
      required: true
    },

    full_name: {
      type: 'string',
      required: true
    },

    middle_name: {
      type: 'string'
    },

    phone_number: {
      type: 'string'
    },

    nar_number: {
      type: 'string'
    },

    office_mui: {
      type: 'number',
      required: false
    },

    status: {
      type: 'string',
      required: true
    },

    office_mlsid: {
      type: 'string'
    },

    work_phone: {
      type: 'string'
    },

    generational_name: {
      type: 'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    matrix_modified_dt: {
      type: 'string',
      required: true
    }
  }
};

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
};

Agent.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Agent not found'));

    return cb(null, res.rows[0]);
  });
};

Agent.getByMLSID = function(id, cb) {
  db.query(sql_search, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Agent corresponding to this MLS ID not found'));

    return Agent.get(res.rows[0].id, cb);
  });
};

Agent.getByOfficeId = function(office_mls, cb) {
  db.query(sql_office_mls, [office_mls], (err, res) => {
    if(err)
      return cb(err);

    var agent_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(agent_ids, Agent.get, function(err, agents) {
      if(err)
        return cb(err);

      if (res.rows.length > 0)
        agents[0].total = res.rows[0].total;

      return cb(null, agents);
    });
  });
};

Agent.getByEmail = function(email, cb) {
  db.query(sql_get_by_email, [email], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Agent not found'));

    return cb(null, res.rows[0].id);
  });
};

Agent.publicize = function(model) {
  delete model.matrix_modified_dt;

  return model;
};

module.exports = function() {};
