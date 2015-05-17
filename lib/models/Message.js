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

    image_thumbnail_url: {
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
var sql_record_ack = require('../sql/message/record_ack.sql');
var sql_mark_all_read = require('../sql/message/mark_all_read.sql');

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
                              message.author,
                              message.image_thumbnail_url],
                 function(err, res) {
                   if(err)
                     return cb(err);

                   Message.updateEverything(message_room_id, message_room.shortlist.id, message_room.listing, function(err, ok) {
                     if(err)
                       return cb(err);

                     MessageRoom.recordAcks(message_room_id, message.author, res.rows[0].id, function(err, acks) {
                       if(err)
                         return cb(err);

                       var aux = '';
                       if (message.comment)
                         aux = ': ' + message.comment;
                       else if(message.image_url)
                         aux = ' sent you a photo';
                       else if(message.video_url)
                         aux = ' sent you a video';
                       else if(message.document_url)
                         aux = ' sent you a document';

                       Notification.issueForMessageRoomExcept(message_room_id,
                                                              message.author,
                                                              message_room.shortlist.id,
                                                              {
                                                                action: 'Sent',
                                                                object_class: 'MessageRoom',
                                                                message: user.first_name + aux,
                                                                object: message_room_id,
                                                                auxiliary_object_class: (message_room.message_room_type === 'Comment') ? 'Recommendation' : null,
                                                                auxiliary_object: message_room.listing,
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
  });
}

Message.updateEverything = function(message_room_id, shortlist_id, listing, cb) {
  Message.updateMessageRoom(message_room_id, function(err, ok) {
    if(err)
      return cb(err);

    if (listing) {
      return Shortlist.updateRecommendationTimes(shortlist_id, listing.id, cb);
    }
    else {
      return cb(null, true);
    }
  });
}

Message.recordAck = function(room_id, message_id, user_id, cb) {
  db.query(sql_record_ack, [room_id, message_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
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

Message.markAllAsRead = function(room_id, user_id, cb) {
  MessageRoom.get(room_id, function(err, message_room) {
    if(err)
      return cb(err);

    db.query(sql_mark_all_read, [room_id, user_id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, true);
    });
  });
}

Message.retrieve = function(room_id, user_id, paging, cb) {
  db.query(sql_retrieve, [room_id,
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

               Message.markAllAsRead(room_id, user_id, function(err, results) {
                 if(err)
                   return cb(err);

                 return cb(null, messages);
               });
             });
           });
}

Message.publicize = function(model) {
  if (model.message_room) delete model.message_room;
  if (model.author) User.publicize(model.author);

  return model;
}

module.exports = function(){};