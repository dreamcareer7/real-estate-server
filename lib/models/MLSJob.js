var db           = require('../utils/db.js');
var validator    = require('../utils/validator.js');

var sql_insert   = require('../sql/mls_job/insert.sql');
var sql_last_run = require('../sql/mls_job/last_run.sql');

MLSJob = {};


var schema = {
  type:'object',
  properties: {
    name: {
      required:true,
      type:'string',
    },

    last_id: {
      type: 'number'
    },

    last_modified_date: {
      type: 'string'
    },

    results: {
      type:'number'
    },

    is_initial_completed: {
      type:'boolean'
    },

    query: {
      type:'string'
    }
  }
}

var validate = validator.bind(null, schema);

MLSJob.insert = function(job, cb) {
  validate(job, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      job.last_modified_date,
      job.last_id,
      job.results,
      job.query,
      job.is_initial_completed,
      job.name,
      job.limit,
      job.offset
    ], cb);
  });
}

MLSJob.getLastRun = function(job, cb) {
  db.query(sql_last_run, [job], (err, res) => {
    if(err)
      return cb(err);

    cb(null, res.rows[0])
  });
}

