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

    listing: {
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
var sql_delete_messages = require('../sql/message_room/delete_messages.sql');
var sql_get_users = require('../sql/message_room/get_users.sql');
var sql_others = require('../sql/message_room/others.sql');
var sql_new_counts = require('../sql/message_room/new_counts.sql');
var sql_add_missing_acks = require('../sql/message_room/add_missing_acks.sql');

function insert(message_room, cb) {
  db.query(sql_insert, [
    message_room.shortlist,
    message_room.message_room_type,
    message_room.owner,
    message_room.listing
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

MessageRoom.addMissingAcks = function(room_id, user_id, cb) {
  db.query(sql_add_missing_acks, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, false);
  });
}

MessageRoom.addUserToRoom = function (room_id, user_id, cb) {
  db.query(sql_add_user, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);


    return MessageRoom.addMissingAcks(room_id, user_id, cb);
  });
}

MessageRoom.create = function(message_room, cb) {
  validate(message_room, function(err) {
    if(err)
      return cb(err);

    insert(message_room, function(err, message_room_id) {
      if(err)
        return cb(err);

      MessageRoom.get(message_room_id, function(err, message_room) {
        if(err)
          return cb(err);

        cb(null, message_room);
      });
    });
  });
}

MessageRoom.getNewCounts = function(message_room_id, user_id, cb) {
  db.query(sql_new_counts, [message_room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res.rows[0]);
  });
}

MessageRoom.getForUser = function(message_room_id, user_id, cb) {
  MessageRoom.get(message_room_id, function(err, message_room) {
    if(err)
      return cb(err);

    MessageRoom.getNewCounts(message_room_id, user_id, function(err, counts) {
      message_room.new_comment_count = counts.new_comment_count || 0;
      message_room.new_video_count = counts.new_video_count || 0;
      message_room.new_image_count = counts.new_image_count || 0;
      message_room.new_document_count = counts.new_document_count || 0;

      return cb(null, message_room);
    });
  });
}

MessageRoom.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('MessageRoom not found'));

    var message_room = res.rows[0];

    async.parallel({
      owner: function(cb) {
        if (!message_room.owner)
          return cb();

        User.get(message_room.owner, cb);
      },
      listing: function(cb) {
        if(!message_room.listing)
          return cb();

        Listing.get(message_room.listing, cb);
      },
      shortlist: function(cb) {
        if(!message_room.shortlist)
          return cb();

        Shortlist.get(message_room.shortlist, cb);
      },
      users: function(cb) {
        if(!message_room.users)
          return cb();

        message_room.users = message_room.users.filter(Boolean);
        async.map(message_room.users, User.get, cb);
      },
      latest_message: function(cb) {
        if(!message_room.latest_message)
          return cb();

        Message.get(message_room.latest_message, cb);
      }
    }, function(err, results) {
         var res_final = message_room;
         res_final.owner = results.owner || null;
         res_final.listing = results.listing || null;
         res_final.shortlist = results.shortlist || null;
         res_final.users = results.users || null
         res_final.latest_message = results.latest_message || null;

         cb(null, res_final);
       });
  });
}

MessageRoom.addUsersToRoom = function(room_id, users, cb) {
  if (!users || users.length < 1)
    return cb(null, false);

    async.mapSeries(users,
                    function(id, cb) {
                      return MessageRoom.addUserToRoom(room_id, id, cb);
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

    db.query(sql_delete_messages, [room_id], function(err, res) {
      if(err)
        return cb(err);

      db.query(sql_delete, [room_id], function(err, res) {
        if(err)
          return cb(err);

        cb(null, true);
      });
    });
  });
}

MessageRoom.getUsers = function(room_id, cb) {
  MessageRoom.get(room_id, function(err, message_room) {
    if(err)
      return cb(err);

    db.query(sql_get_users, [room_id], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(null, false);

      cb(null, res.rows);
    });
  });
}

MessageRoom.getUserIds = function(id, cb) {
  MessageRoom.getUsers(id, function(err, users) {
    if(err)
      return cb(err);

    var user_ids = users.map(function(r) {
                     return r.user;
                   });

    return cb(null, user_ids);
  });
}

MessageRoom.others = function(room_id, user_id, cb) {
  MessageRoom.get(room_id, function(err, message_room) {
    if(err)
      return cb(err);

    db.query(sql_others, [room_id, user_id], function(err, res) {
      if(err)
        return cb(err);

      var others = res.rows.map(function(r) {
                  return r.user;
                });

      cb(null, others);
    });
  });
}

MessageRoom.publicize = function(model) {
  if (model.owner) User.publicize(model.owner);
  if (model.listing) Listing.publicize(model.listing);
  if (model.shortlist) Shortlist.publicize(model.shortlist);
  if (model.users) model.users.map(User.publicize);
  if (model.latest_message) Message.publicize(model.latest_message);

  return model;
}

MessageRoom.recordAcks = function(room_id, user_id, message_id, cb) {
  MessageRoom.get(room_id, function(err, message_room) {
    if(err)
      return cb(err);

    MessageRoom.others(room_id, user_id, function(err, users) {
      async.mapSeries(users, function(r, cb) {
        return Message.recordAck(room_id, message_id, r, cb);
      }, function(err, results) {
           if(err)
             return cb(err);

           return cb(null, results);
         });
    });
  });
}

module.exports = function(){};