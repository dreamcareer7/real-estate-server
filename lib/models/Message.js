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
      required: false
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
var sql_mark_read = require('../sql/message/mark_all_read.sql');

Message.record = function(message_room_id, message, push, cb) {
  async.auto({
    message_room: function(cb) {
      return MessageRoom.get(message_room_id, cb);
    },
    author: function(cb) {
      if(!message.author)
        return cb();

      User.get(message.author, cb);
    },
    validate: function(cb) {
      return validate(message, cb);
    },
    record: ['validate',
             function(cb) {
               db.query(sql_record, [message_room_id,
                                     message.message_type,
                                     message.comment,
                                     message.image_url,
                                     message.document_url,
                                     message.video_url,
                                     message.object,
                                     message.author,
                                     message.image_thumbnail_url,
                                     message.viewable_by,
                                     message.subjects,
                                     message.objects,
                                     message.subject_class,
                                     message.object_class],
                        function(err, res) {
                          if(err)
                            return cb(err);

                          return cb(null, res.rows[0].id);
                        });
             }],
    update_everything: ['message_room',
                        'record',
                        function(cb, results) {
                          var message_room = results.message_room;
                          return Message.updateEverything(message_room_id, message_room.shortlist.id, message_room.listing, cb);
                        }],
    record_acks: ['update_everything',
                  function(cb, results) {
                    var message_id = results.record;
                    return MessageRoom.recordAcks(message_room_id, message.author, message_id, cb);
                  }],
    activate: ['record_acks',
               function(cb, results) {
                 return MessageRoom.activate(message_room_id, cb);
               }],
    message: ['activate',
              'record',
              function(cb, results) {
                Message.get(results.record, cb);
              }],
    push: ['message_room',
           'message',
           'record',
           'author',
           function(cb, results) {
             if (push) {
               var message_room = results.message_room;
               var message_id = results.record;

               var aux = '';
               var sub_aux = '';
               var notification = {};
               var address_line = (message_room.listing) ? Address.getLocalized(message_room.listing.property.address) : '';

               if (message.comment) {
                 aux = ' ' + message.comment;
                 sub_aux = 'Comment';
               }
               else if(message.image_url) {
                 aux = (message_room.message_room_type === 'Comment') ? (' added a photo to ' + address_line): ' sent a photo';
                 sub_aux = 'Photo';
               }
               else if(message.video_url) {
                 aux = (message_room.message_room_type === 'Comment') ? (' added a video to ' + address_line): ' sent a video';
                 sub_aux = 'Video';
               }
               else if(message.document_url) {
                 aux = (message_room.message_room_type === 'Comment') ? (' added a document to ' + address_line): ' sent a document';
                 sub_aux = 'Document';
               }

               var user = {};
               user.first_name = 'Rechat';

               if(results.author)
                 user = results.author;

               var base_message = '#' + message_room.shortlist.title + ': @' + user.first_name;
               notification.action = 'Sent';
               notification.subject = user.id;
               notification.subject_class = 'User';
               notification.object = message_id;
               notification.object_class = 'Message';
               notification.auxiliary_object = message_room_id;
               notification.auxiliary_object_class = 'MessageRoom';
               notification.message = base_message + aux;
               notification.listing = ((message_room.listing) ? message_room.listing.id : null);
               notification.extra_object_class = (message_room.message_room_type === 'Comment') ? 'Recommendation' : null;
               notification.extra_subject_class = sub_aux;

               Notification.issueForMessageRoomExcept(message_room_id, message.author, message_room.shortlist.id, notification, cb);
             } else {
               return cb();
             }
           }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.message);
     });
}

Message.updateEverything = function(message_room_id, shortlist_id, listing, cb) {
  Message.updateMessageRoom(message_room_id, function(err, ok) {
    if(err)
      return cb(err);

    if(listing)
      return Shortlist.updateRecommendationTimes(shortlist_id, listing.id, cb);
    else
      return cb(null, true);
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

    async.auto({
      author: function(cb) {
        if (!message.author)
          return cb();

        User.get(message.author, cb);
      },
      viewable_by: function(cb) {
        if(!message.viewable_by)
          return cb();

        User.get(message.viewable_by, cb);
      },
      shortlist: function(cb) {
        if(!message.message_room)
          return cb();

        MessageRoom.getShortlist(message.message_room, cb);
      },
      subjects: ['viewable_by',
                 'shortlist',
                 function(cb, results) {
                   if(!message.subjects)
                     return cb();

                   var ref = {
                     user: results.viewable_by,
                     shortlist: results.shortlist
                   };

                   async.map(message.subjects, function(r, cb) {
                     return ObjectUtil.dereference(message.subject_class, r, ref, cb);
                   }, cb);
                 }],
      objects: ['viewable_by',
                'shortlist',
                function(cb, results) {
                  if(!message.objects)
                    return cb();

                  var ref = {
                    user: message.viewable_by,
                    shortlist: results.shortlist
                  };

                  async.map(message.objects, function(r, cb) {
                    return ObjectUtil.dereference(message.object_class, r, ref, cb);
                  }, cb);
                }]
    }, function(err, results) {
         if(err)
           return cb(err);

         var res_final = message;
         res_final.author = results.author || null;
         res_final.subjects = results.subjects || null;
         res_final.objects = results.objects || null;

         return cb(null, res_final);
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

Message.markAsRead = function(message_id, cb) {
  db.query(sql_mark_read, [message_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

Message.retrieve = function(room_id, user_id, paging, cb) {
  MessageRoom.get(room_id, function(err, message_room) {
    if(err)
      return cb(err);

    db.query(sql_retrieve, [room_id,
                            user_id,
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
  });
}

Message.publicize = function(model) {
  if (model.total) delete model.total;
  if (model.message_room) delete model.message_room;
  if (model.author) User.publicize(model.author);

  return model;
}

module.exports = function(){};