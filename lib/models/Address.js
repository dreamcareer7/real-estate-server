var validator = require('../utils/validator.js');
var db = require('../utils/db.js');

Address = {};

var schema = {
  type:'object',
  properties: {
    title:{
      type:'string',
      required:true
    },

    subtitle:{
      type:'string',
      required:true
    }
  }
}

Address.validate = validator.bind(null, schema);

var delete_sql = 'DELETE FROM addresses WHERE id = $1';
Address.delete = function(id, cb) {
  db.query(delete_sql, [id], cb);
}

var create_sql = 'INSERT INTO addresses (type, title, subtitle, street_number, street_name, city, \
state, state_code, zip_code, neighborhood) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id';

Address.create = function(address, cb) {
  Address.validate(address, function(err) {
    if(err)
      return cb(err);

    db.query(create_sql, [
      address.type,
      address.title,
      address.subtitle,
      address.street_number,
      address.street_name,
      address.city,
      address.state,
      address.state_code,
      address.zip_code,
      address.neighborhood,
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].id);
    });
  });
}

var get = "SELECT *, 'address' as type FROM addresses WHERE id = $1 LIMIT 1";
Address.get = function(id, cb) {
  db.query(get, [id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};