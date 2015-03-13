var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var validator = require('../utils/validator.js');
var async = require('async');

Message = {};

var schema = {
  type: 'object',
  properties: {
    message_type: {
      type: 'string',
      enum: [ 'TopLevel', 'SubLevel' ],
      required: true
    },

    comment: {
      type: 'string',
      required: false
    },

    image_url: {
      type: 'string',
      required: false
    },

    document_url: {
      type: 'string',
      required: false
    },

    video_url: {
      type: 'string',
      required: false
    },

    object: {
      type: 'string',
      uuid: true,
      required: false
    },

    author: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

var sql_record = require('../sql/message/record.sql');
var sql_retrieve = require('../sql/message/retrieve.sql');
var sql_get = require('../sql/message/get.sql');
var sql_update_message_room = require('../sql/message/update_message_room.sql');

Message.record = function(message_room_id, message, cb) {
  MessageRoom.get(message_room_id, function(err, message_room) {
    if(err)
      return cb(err);

    User.get(message.author, function(err, user) {
      if(err)
        return cb(err);

      validate(message, function(err) {
        if(err)
          return cb(err);

        db.query(sql_record, [message_room_id,
                              message.message_type,
                              message.comment,
                              message.image_url,
                              message.document_url,
                              message.video_url,
                              message.object,
                              message.author],
                 function(err, res) {
                   if(err)
                     return cb(err);

                   Message.updateMessageRoom(message_room_id, function(err, ok) {
                     if(err)
                       return cb(err);

                     Notification.issueForMessageRoomExcept(message_room_id,
                                                            message.author,
                                                            message_room.shortlist.id,
                                                            {
                                                              action: 'Sent',
                                                              object_class: 'MessageRoom',
                                                              message: user.first_name + ' sent you a message',
                                                              object: message_room_id,
                                                              notifying_user: user.id
                                                            }, function(err, ok) {
                                                                 Message.get(res.rows[0].id, function(err, message) {
                                                                   if(err)
                                                                     return cb(err);

                                                                   return cb(null, message);
                                                                 });
                                                          });
                   });
                 });
      });
    });
  });
}

Message.updateMessageRoom = function(message_room, cb) {
  db.query(sql_update_message_room, [message_room], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, false);
  });
}

Message.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var message = res.rows[0];

    async.parallel({
      author: function(cb) {
        if (!message.author)
          return cb();

        User.get(message.author, cb);
      }
    }, function(err, results) {
         var res_final = message;
         res_final.author = results.author || null;

         cb(null, res_final);
       });
  });
}

Message.retrieve = function(message_room, paging, cb) {
  db.query(sql_retrieve, [message_room,
                          paging.type,
                          paging.timestamp,
                          paging.limit],
           function(err, res) {
             if(err)
               return cb(err);

             if(res.rows.length < 1)
               return cb(null, []);

             var message_ids = res.rows.map(function(r) {
                             return r.id;
                           });

             async.map(message_ids, Message.get, function(err, messages) {
               if(err)
                 return cb(err);

               return cb(null, messages);
             });
           });
}

Message.publicize = function(model) {
  if (model.message_room) delete model.message_room;
  if (model.author) User.publicize(model.author);

  return model;
}

module.exports = function(){};