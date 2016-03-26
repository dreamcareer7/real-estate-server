var async          = require('async');

var db             = require('../utils/db.js');
var validator      = require('../utils/validator.js');

var sql_insert     = require('../sql/agent/insert.sql');
var sql_get        = require('../sql/agent/get.sql');
var sql_get_by_email        = require('../sql/agent/get_by_email.sql');
var sql_search     = require('../sql/agent/search.sql');
var sql_office_mls = require('../sql/agent/office_mls.sql');
var sql_report = require('../sql/agent/report.sql');

Agent = {};

var schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      required: false
    },

    mlsid: {
      type: 'string',
      required: true
    },

    fax: {
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false
    },

    last_name: {
      type: 'string',
      required: false
    },

    full_name: {
      type: 'string',
      required: false
    },

    middle_name: {
      type: 'string',
      required: false
    },

    phone_number: {
      type: 'string',
      required: false
    },

    nar_number: {
      type: 'string',
      required: false
    },

    office_mui: {
      type: 'number',
      required: false
    },

    status: {
      type: 'string',
      required: false
    },

    office_mlsid: {
      type: 'string',
      required: false
    },

    work_phone: {
      type: 'string',
      required: false
    },

    generational_name: {
      type: 'string',
      required: false
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    matrix_modified_dt: {
      type: 'string',
      required: false
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
      return cb(Error.ResourceNotFound('Agent corresponding to this MLS ID ('+id+') not found'));

    return Agent.get(res.rows[0].id, cb);
  });
};

Agent.getByOfficeId = function(office_mls, cb) {
  db.query(sql_office_mls, [office_mls], (err, res) => {
    if(err)
      return cb(err);

    var agent_ids = res.rows.map( a => a.id );

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

Agent.report = function(criteria, cb) {
  var fillAgent = (data, cb) => {
    Agent.getByMLSID(data.agent, (err, agent) => {
      if(err && err.code === 'ResourceNotFound') {
        var agent = {
          type:'agent',
          first_name: 'Unknown Agent',
          last_name: '('+data.agent+')',
          data:data,
          mlsid:data.agent
        }
        delete agent.data.agent;

        return cb(null, agent);
      }

      if(err)
        return cb(err);


      agent.data = data;
      delete agent.data.agent;
      cb(null, agent)
    });
  }

  db.query(sql_report,
          [
           criteria.area              || null,
           criteria.sub_area          || null,

           criteria.from              || null,
           criteria.to                || null,

           criteria.list_volume.min  || null,
           criteria.list_volume.max  || null,

           criteria.list_value.min  || null,
           criteria.list_value.max  || null,

           criteria.sell_volume.min  || null,
           criteria.sell_volume.max  || null,

           criteria.sell_value.min  || null,
           criteria.sell_value.max  || null,

           criteria.active_volume.min  || null,
           criteria.active_volume.max  || null,

           criteria.active_value.min  || null,
           criteria.active_value.max  || null,

           criteria.total_active_volume.min  || null,
           criteria.total_active_volume.max  || null,

           criteria.total_active_value.min  || null,
           criteria.total_active_value.max  || null,

           criteria.agent_experience || null,

           criteria.total_value.min  || null,
           criteria.total_value.max  || null,

           criteria.total_volume.min  || null,
           criteria.total_volume.max  || null,
          ], (err, res) => {
            if(err)
              return cb(err);

              async.mapLimit(res.rows, 1, fillAgent, cb)
          });
}

Agent.publicize = function(model) {
  delete model.matrix_modified_dt;

  return model;
};

module.exports = function() {};
