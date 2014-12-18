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
    },

    owner: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO shortlists (group_type, description, owner) VALUES ($1, $2, $3) RETURNING id';
function insert(shortlist, cb) {
  db.query(insert_sql, [
    shortlist.group_type,
    shortlist.description,
    shortlist.owner
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

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

Shortlist.create = function(shortlist, cb) {
  validate(shortlist, function(err) {
    if(err)
      return cb(err);

    User.get(shortlist.owner, function(err, user) {
      if (err)
        return cb(err);

      insert(shortlist, cb);
    });
  });
}

var delete_sql = 'DELETE FROM shortlists WHERE id = $1';
Shortlist.delete = function(id, cb) {
  db.query(delete_sql, [id], cb);
}

module.exports = function(){};