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

var adduser_sql = 'INSERT INTO shortlists_users ("user", shortlist) VALUES ($1, $2)';
function add_user(user_id, shortlist_id, cb) {
  db.query(adduser_sql, [user_id, shortlist_id], function(err, res) {
    if(err) {
      if (err.code === '23505')
        return cb();

      return cb(err);
    }

    if(res.rows.length < 1)
      return cb(null, false);

    cb();
  });
}

var get_sql = "SELECT *, 'shortlist' AS type FROM shortlists WHERE id = $1";
Shortlist.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err) {
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

Shortlist.addUser = function(user_id, shortlist_id, cb) {
    User.get(user_id, function(err, user) {
      if (err)
        return cb(err);
      Shortlist.get(shortlist_id, function(err, shortlist) {
        if (err)
          return cb(err);

        add_user(user_id, shortlist_id, cb);
        });
    });
}

var getusers_sql = "SELECT users.*, 'user' AS type FROM USERS INNER JOIN shortlists_users \
ON users.id = shortlists_users.user WHERE shortlists_users.shortlist = $1";
Shortlist.getUsers = function(id, cb) {
  db.query(getusers_sql, [id], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows);
  });
}

module.exports = function(){};