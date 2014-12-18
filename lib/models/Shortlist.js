var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Shortlist = {};

var schema = {
  type: 'object',
  properties: {
    group_type: {
      type: 'string',
      required: true,
      enum: [ 'Shoppers', 'Sellers' ],
      uuid: false
    },

    description: {
      type: 'string',
      required: true,
      uuid: false
    }
  }
}

var validate = validator.bind(null, schema);

var get_sql = "SELECT *, 'shortlist' AS type FROM shortlists WHERE id = $1";
Shortlist.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err) {
      console.log(res);
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

var insert_sql = 'INSERT INTO shortlists (group_type, description) VALUES ($1, $2) RETURNING id';
Shortlist.create = function(shortlist, cb) {
  console.log("GroupType = ", shortlist.group_type);
  validate(shortlist, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      shortlist.group_type,
      shortlist.description,
    ], function(err, res) {
         if(err)
           return cb(err);

         return cb(null, res.rows[0].id);
       });
  });
}

var delete_sql = 'DELETE FROM shortlists WHERE id = $1';
Shortlist.delete = function(id, cb) {
  db.query(delete_sql, [id], cb);
}

module.exports = function(){};