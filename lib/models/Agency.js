var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql = require('../utils/require_sql.js');

Agency = {};

var schema = {
  type:'object',
  properties: {
    name: {
      required:true,
      type:'string',
    },

    phone_number: {
      type:'string',
    },

    address: {
      type:'string',
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Agency object
var sql_insert = require('../sql/agency/insert.sql');
var sql_get = require('../sql/agency/get.sql');
var sql_delete = require('../sql/agency/delete.sql');
var sql_update = require('../sql/agency/update.sql');
var sql_get_agents = require('../sql/agency/get_agents.sql');
var sql_avatar = require('../sql/agency/avatar.sql');
var sql_cover = require('../sql/agency/cover.sql');

Agency.create = function(agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      agency.name,
      agency.phone_number,
      agency.address,
    ], function(err, res) {
      if(err)
        return cb(err);

      cb(null, res.rows[0].id);
    });
  });
}

Agency.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

Agency.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Agency.update = function(agency_id, agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(sql_update, [
      agency.name,
      agency.phone_number,
      agency.address,
      agency_id
    ], cb);
  });
}

Agency.getAgents = function(agency_id, cb) {
  db.query(sql_get_agents, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Agency.publicize = function(model) {
  if (!model.address_id)
    model.address = null;

  delete model.address_id;
}

Agency.getAvatar = function(agency_id, cb) {
  db.query(sql_avatar, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Profile image not found'));

    cb(null, res.rows[0]);
  });
}

Agency.getCover = function(agency_id, cb) {
  db.query(sql_cover, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Cover image not found'));

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};