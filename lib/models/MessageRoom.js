var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var validator = require('../utils/validator.js');
var async = require('async');

MessageRoom = {};

var schema = {
  type: 'object',
  properties: {
    message_room_type: {
      type: 'string',
      required: true,
      enum: [ 'Shortlist', 'Comment', 'GroupMessaging', 'OneToOneMessaging' ]
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    },

    shortlist: {
      type: 'string',
      uuid: true,
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

var sql_get = require('../sql/message_room/get.sql');
var sql_insert = require('../sql/message_room/insert.sql');
var sql_add_user = require('../sql/message_room/add_user.sql');
var sql_leave = require('../sql/message_room/leave.sql');
var sql_leave_all = require('../sql/message_room/leave_all.sql');
var sql_delete = require('../sql/message_room/delete.sql');

function insert(message_room, cb) {
  db.query(sql_insert, [
    message_room.shortlist,
    message_room.message_room_type,
    message_room.owner
  ], function(err, res) {
       if(err)
         return cb(err);

       MessageRoom.addUsersToRoom(res.rows[0].id, message_room.users, function(err, ok) {
         if (err)
           return cb(err);

         return cb(null, res.rows[0].id);
       });
     });
}

function addUserToRoom(room_id, user_id, cb) {
  db.query(sql_add_user, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, false);
  });
}

MessageRoom.create = function(message_room, cb) {
  validate(message_room, function(err) {
    if(err)
      return cb(err);

    insert(message_room, cb);
  });
}

MessageRoom.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('MessageRoom not found'));

    cb(null, res.rows[0]);
  });
}

MessageRoom.addUsersToRoom = function(room_id, users, cb) {
  if (!users || users.length < 1)
    return cb(null, false);

    async.map(users,
            function(id, cb) {
              return addUserToRoom(room_id, id, cb);
            },
            function(err, foo) {
              if(err)
                return cb(err);

              return cb(null, true);
            }
           );
}

MessageRoom.deleteUserFromRoom = function(room_id, user_id, cb) {
  db.query(sql_leave, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

MessageRoom.deleteAllUsers = function(room_id, cb) {
  db.query(sql_leave_all, [room_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

MessageRoom.delete = function(room_id, cb) {
  MessageRoom.deleteAllUsers(room_id, function(err, ok) {
    if (err)
      return cb(err);

    db.query(sql_delete, [room_id], function(err, res) {
      if(err)
        return cb(err);

      cb(null, true);
    });
  });
}

module.exports = function(){};