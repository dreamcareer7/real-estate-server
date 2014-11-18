var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Agency = {};

var schema = {
  type:'object',
  properties: {
    type: {
      required:true,
      type:'string'
    },

    name: {
      required:true,
      type:'string',
    },

    phonenumber: {
      type:'string',
    },

    address: {
      type:'string',
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO agencies (type, name, phonenumber, address) VALUES ($1,$2,$3,$4) RETURNING id';

Agency.create = function(agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      agency.type,
      agency.name,
      agency.phonenumber,
      agency.address,
    ], function(err, res) {
      if(err)
        return cb(err);

      cb(null, res.rows[0].id);
    });
  });
}

var get_sql = 'SELECT * FROM agencies WHERE id = $1';
Agency.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

var delete_sql = 'DELETE FROM agencies WHERE id = $1';
Agency.delete = function(id, cb) {
  db.query(delete_sql, [id], cb);
}

var update_sql = 'UPDATE agencies SET name = $1, phonenumber = $2,\
address = $3 WHERE id = $4';

Agency.update = function(agency_id, agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      agency.name,
      agency.phonenumber,
      agency.address,
      agency_id
    ], cb);
  });
}

module.exports = function(){};