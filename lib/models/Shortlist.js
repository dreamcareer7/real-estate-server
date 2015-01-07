var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');

Shortlist = {};

var schema = {
  type: 'object',
  properties: {
    shortlist_type: {
      type: 'string',
      required: true,
      enum: [ 'Shoppers', 'Sellers' ],
      uuid: false
    },

    description: {
      type: 'string',
      required: false,
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

var insert_sql = 'INSERT INTO shortlists (shortlist_type, description, owner) VALUES ($1, $2, $3) RETURNING id';
function insert(shortlist, cb) {
  db.query(insert_sql, [
    shortlist.shortlist_type,
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

var getshortlists_sql =
 "SELECT\
 (COUNT(*) OVER())::INT AS full_count,\
 'shortlist' AS type,\
 shortlist AS id\
 FROM shortlists_users\
 WHERE shortlists_users.user = $1"

Shortlist.getAllForUser = function(id, cb) {
  db.query(getshortlists_sql, [id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, false);

    var shortlist_ids = res.rows.map(function(r) {
                          return r.id;
                        });
    async.map(shortlist_ids, Shortlist.get, function(err, shortlists) {
      shortlists[0].full_count = shortlists.length;
      cb(null, shortlists);
    });
    // cb(null, res.rows);
  });
}

var getusers_sql =
 "SELECT\
 (COUNT(*) OVER())::INT AS full_count,\
 'user' AS type,\
 users.*,\
 EXTRACT(EPOCH FROM users.created_at)::INT AS created_at,\
 EXTRACT(EPOCH FROM users.updated_at)::INT AS updated_at,\
 (SELECT ROW_TO_JSON(_) FROM (SELECT addresses.*, 'address' AS type) AS _) AS address\
 FROM users\
 INNER JOIN shortlists_users\
 ON users.id = shortlists_users.user\
 LEFT JOIN addresses\
 ON users.address_id = addresses.id\
 WHERE shortlists_users.shortlist = $1";
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

var get_sql = "SELECT\
 'shortlist' AS type,\
 shortlists.*\
 FROM shortlists\
 WHERE id = $1";
Shortlist.get = function(id, cb) {
  var res_final;
  var res_owner;

  db.query(get_sql, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Shortlist not found'));

    User.get(res_base.rows[0].owner, function(err, user) {
      if (err)
        return cb(err);

      Shortlist.getUsers(id, function(err, users) {
        if (err)
          return cb(err);

        res_owner = user;
        res_final = res_base.rows[0];
        res_final.owner = res_owner;
        res_final.users = users;

        cb(null, res_final);
      });
    });
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

var update_sql = 'UPDATE shortlists SET shortlist_type = $1, description = $2, owner = $3 WHERE id = $4';
Shortlist.update = function(shortlist_id, shortlist, cb) {
  validate(shortlist, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      shortlist.shortlist_type,
      shortlist.description,
      shortlist.owner,
      shortlist_id
    ], cb);
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

Shortlist.publicize = function(model) {
  if (model.owner) User.publicize(model.owner);
  if (model.users) model.users.map(User.publicize);
  return model;
}

module.exports = function(){};