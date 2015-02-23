var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');
var sql = require('../utils/require_sql.js');

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

// SQL queries to work with Shortlist object
var sql_insert = require('../sql/shortlist/insert.sql');
var sql_get = require('../sql/shortlist/get.sql');
var sql_update = require('../sql/shortlist/update.sql');
var sql_delete = require('../sql/shortlist/delete.sql');
var sql_get_for_user = require('../sql/shortlist/get_for_user.sql');
var sql_add_user = require('../sql/shortlist/add_user.sql');
var sql_get_users = require('../sql/shortlist/get_users.sql');
var sql_add_missing = require('../sql/shortlist/add_missing.sql');
var sql_rooms = require('../sql/shortlist/rooms.sql');
var sql_user_rooms = require('../sql/shortlist/user_rooms.sql');
var sql_others = require('../sql/shortlist/others.sql');
var sql_join_default = require('../sql/shortlist/join_default.sql');

function insert(shortlist, cb) {
  db.query(sql_insert, [
    shortlist.shortlist_type,
    shortlist.description,
    shortlist.owner
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

function add_user(user_id, shortlist_id, cb) {
  db.query(sql_add_user, [user_id, shortlist_id], function(err, res) {
    if(err) {
      if (err.code === '23505')
        return cb();

      return cb(err);
    }

    db.query(sql_add_missing, [user_id, shortlist_id], function(err, res) {
      if(err)
        return cb(err);

      cb(null, false);
    });
  });
}

Shortlist.getAllForUser = function(id, cb) {
  db.query(sql_get_for_user, [id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var shortlist_ids = res.rows.map(function(r) {
                          return r.id;
                        });
    async.map(shortlist_ids, Shortlist.get, function(err, shortlists) {
      cb(null, shortlists);
    });
  });
}

Shortlist.getUsers = function(id, cb) {
  db.query(sql_get_users, [id], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows);
  });
}

Shortlist.get = function(id, cb) {
  var res_final;
  var res_owner;

  db.query(sql_get, [id], function(err, res_base) {
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

      insert(shortlist, function(err, shortlist_id) {
        if(err)
          return cb(err);

        Shortlist.createDefaultRoom(shortlist_id, shortlist.owner, function(err, message_room_id) {
            if(err)
              return cb(err);

          Shortlist.addUser(shortlist.owner, shortlist_id, function(err, ok) {
            if(err)
              return cb(err);
            return cb(null, shortlist_id);
          });
        });
      });
    });
  });
}

Shortlist.update = function(shortlist_id, shortlist, cb) {
  validate(shortlist, function(err) {
    if(err)
      return cb(err);

    db.query(sql_update, [
      shortlist.shortlist_type,
      shortlist.description,
      shortlist.owner,
      shortlist_id
    ], cb);
  });
}

Shortlist.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Shortlist.addUser = function(user_id, shortlist_id, cb) {
    User.get(user_id, function(err, user) {
      if (err)
        return cb(err);
      Shortlist.get(shortlist_id, function(err, shortlist) {
        if (err)
          return cb(err);

        add_user(user_id, shortlist_id, function(err, ok) {
          if(err)
            return cb(err);

          Shortlist.joinDefaultRoom(user_id, shortlist_id, function(err, ok) {
            if(err)
              return cb(err);
            Shortlist.others(shortlist_id, user_id, function(err, others) {
              if(err)
                return cb(err);

              var others_ids = others.map(function(r) {
                                 return r.user;
                               });

              async.map(others_ids, function(other_id, cb) {
                return Shortlist.createPrivateMessageOnShortlist(user_id, other_id, shortlist_id, cb);
              }, function(err, message_room_id) {
                   if(err)
                     return cb(err);
                   return cb(null, true);
                 });
            });
          });
        });
      });
    });
}

Shortlist.createPrivateMessageOnShortlist = function(user_id, peer_id, shortlist_id, cb) {
  var message_room = {}
  message_room.shortlist = shortlist_id;
  message_room.message_room_type = 'OneToOneMessaging';
  message_room.users = [ user_id, peer_id ];

  MessageRoom.create(message_room, function(err, message_room) {
    if(err)
      return cb(err);

    return cb(null, message_room.id);
  });
}

Shortlist.getRooms = function(shortlist_id, cb) {
  db.query(sql_rooms, [shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    var message_room_ids = res.rows.map(function(r) {
                         return r.id;
                       });
    async.map(message_room_ids, MessageRoom.get, function(err, message_rooms) {
      if(err)
        return cb(err);

      cb(null, message_rooms);
    });
  });
}

Shortlist.getUserRooms = function(user_id, shortlist_id, type, cb) {
  db.query(sql_user_rooms, [user_id, shortlist_id, type], function(err, res) {
    if(err)
      return cb(err);

    var message_room_ids = res.rows.map(function(r) {
                             return r.message_room;
                           });

    async.map(message_room_ids, MessageRoom.get, function(err, message_rooms) {
      if(err)
        return cb(err);

      cb(null, message_rooms);
    });
  });
}

Shortlist.joinDefaultRoom = function(user_id, shortlist_id, cb) {
  db.query(sql_join_default, [user_id, shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, false);
  });
}

Shortlist.createDefaultRoom = function(shortlist_id, owner, cb) {
  var message_room = {};
  message_room.shortlist = shortlist_id;
  message_room.owner = owner;
  message_room.message_room_type = 'Shortlist';

  MessageRoom.create(message_room, function(err, message_room) {
    if(err)
      return cb(err);

    return cb(null, message_room.id);
  });
}

Shortlist.others = function(shortlist_id, user_id, cb) {
  db.query(sql_others, [shortlist_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Shortlist.publicize = function(model) {
  if (model.owner) User.publicize(model.owner);
  if (model.users) model.users.map(User.publicize);
  return model;
}

module.exports = function(){};