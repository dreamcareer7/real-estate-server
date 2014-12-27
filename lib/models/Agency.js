var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

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

var insert_sql = 'INSERT INTO agencies (name, phone_number, address) VALUES ($1,$2,$3) RETURNING id';

Agency.create = function(agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
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

var get_sql = "SELECT\
 'agency' AS type,\
 agencies.*,\
 row_to_json(addresses.*) AS address\
 FROM agencies\
 LEFT JOIN addresses\
 ON agencies.address_id = addresses.id\
 WHERE agencies.id = $1";
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

var update_sql = 'UPDATE agencies SET name = $1, phone_number = $2,\
address = $3 WHERE id = $4';
Agency.update = function(agency_id, agency, cb) {
  validate(agency, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      agency.name,
      agency.phone_number,
      agency.address,
      agency_id
    ], cb);
  });
}

var get_agents = 'SELECT * FROM users WHERE agency_id = $1';
Agency.getAgents = function(agency_id, cb) {
  db.query(get_agents, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Agency.publicize = function(model) {
  delete model.address_id;
}

getprofilepicture_sql = "SELECT\
 'url' AS type,\
 profile_image_url AS url\
 FROM agencies\
 WHERE id = $1";
Agency.getProfilePicture = function(agency_id, cb) {
  db.query(getprofilepicture_sql, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Profile image not found'));

    cb(null, res.rows[0]);
  });
}

getcoverpicture_sql = "SELECT\
 'url' AS type,\
 cover_image_url AS url\
 FROM agencies\
 WHERE id = $1";
Agency.getCoverPicture = function(agency_id, cb) {
  db.query(getcoverpicture_sql, [agency_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Profile image not found'));

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};