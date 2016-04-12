/**
 * @namespace Message
 */

var db           = require('../utils/db.js');
var sql          = require('../utils/require_sql.js');
var validator    = require('../utils/validator.js');
var async        = require('async');
var EventEmitter = require('events').EventEmitter;
var config       = require('../config.js');
var sprintf      = require('sprintf-js').sprintf;
var _u           = require('underscore');

var sql_post     = require('../sql/message/post.sql');
var sql_get      = require('../sql/message/get.sql');
var sql_retrieve = require('../sql/message/retrieve.sql');

var seamless_message_body           = require('../html/message/body.html');

seamless_item                       = require('../html/message/message.html');
seamless_item_image                 = require('../html/message/message_image.html');
seamless_item_listing               = require('../html/message/message_listing.html');
seamless_item_listing_without_image = require('../html/message/message_listing_without_image.html');

Message = new EventEmitter;

/**
 * * `TopLevel`: A `message` in the main thread
 * * `SubLevel`: A sublevel `message` belongs to a specific object eg. `recommendation`
 * @typedef message_type
 * @type {string}
 * @memberof Message
 * @instance
 * @enum {string}
 */

/**
 * @typedef message
 * @type {object}
 * @memberof Message
 * @instance
 * @property {uuid} id - ID of this message
 * @property {string=} comment - text content of this message if any
 * @property {string=} image_url - URL of the image attached to this message if any
 * @property {string=} document_url - URL of the document attached to this message if any
 * @property {string=} video_url - URL of the video attached to this message if any
 * @property {uuid=} object - ID of the object attached to this message if any
 * @property {uuid=} author - ID of the author of this message if it's not system generated
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 * @property {uuid} room - ID of the room this message belongs to
 * @property {Message#message_type} message_type - type of this message. Could be `Top-Level` or `Sub-Level`
 * @property {string=} image_thumbnail_url - URL of the thumbnail image attached to this message if any
 * @property {uuid=} notification - ID of the notification object linked with this message
 */

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

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    },

    author: {
      type: 'string',
      uuid: true,
      required: false
    },

    mentions: {
      type: 'array',
      required: false,
      items: {
        type: 'string',
        uuid: 'true'
      }
    },

    attachments: {
      type: 'array',
      required: false,
      items: {
        type: 'string',
        uuid: true
      }
    },

    notification: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

/**
 * Posts a `message` to a `room`
 * @name post
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} room_id - ID of the room to post this message to
 * @param {Message#message} message - full `message` object
 * @param {boolean} push - indicates whether a notification should be generated for this message or not
 * @param {callback} cb - callback function
 * @returns {Message#message}
 */
Message.post = function(room_id, message, push, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb);
    },
    author: cb => {
      if(!message.author)
        return cb();

      return User.get(message.author, cb);
    },
    validate: cb => {
      return validate(message, cb);
    },
    recommendation: cb => {
      if(!message.recommendation)
        return cb();

      return Recommendation.get(message.recommendation, cb);
    },
    mentions: cb => {
      if(!message.mentions)
        return cb();

      return async.map(message.mentions, User.get, cb);
    },
    is_member: [
      'room',
      'author',
      (cb, results) => {
        if (!Room.belongs(results.room.users, message.author))
          return cb(Error.Forbidden('User is not a member of this room'));

        return cb();
      }
    ],
    post: [
      'is_member',
      'validate',
      'mentions',
      cb => {
        db.query(sql_post, [
          room_id,
          message.message_type,
          message.comment,
          message.image_url,
          message.document_url,
          message.video_url,
          message.recommendation,
          message.reference,
          message.author,
          message.notification,
          message.mentions
        ], function(err, res) {
          if(err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
      }
    ],
    attachments: [
      'post',
      (cb, results) => {
        async.map(message.attachments, (r, cb) => {
          Attachment.get(r, err => {
            if(err)
              return cb(err);

            return Attachment.link(results.post, r, cb);
          });
        }, cb);
      }
    ],
    message: [
      'post',
      'attachments',
      (cb, results) => {
        return Message.get(results.post, cb);
      }
    ],
    push: [
      'room',
      'author',
      'recommendation',
      'validate',
      'post',
      'attachments',
      'message',
      (cb, results) => {
        Message.emit('new message', {
          message: results.message,
          room: results.room
        });

        if(!push)
          return cb();

        var room = results.room;
        var message_id = results.post;

        var aux = '';
        var sub_aux = '';
        var notification = {};
        var address_line = (message.recommendation) ? Address.getLocalized(results.recommendation.listing.property.address) : '';

        if (message.comment) {
          aux = ' ' + message.comment;
          sub_aux = 'Comment';
        }
        else if(message.image_url) {
          aux = (message.recommendation) ? (' added a photo to ' + address_line): ' sent a photo';
          sub_aux = 'Photo';
        }
        else if(message.video_url) {
          aux = (message.recommendation) ? (' added a video to ' + address_line): ' sent a video';
          sub_aux = 'Video';
        }
        else if(message.document_url) {
          aux = (message.recommendation) ? (' added a document to ' + address_line): ' sent a document';
          sub_aux = 'Document';
        } else {
          sub_aux = 'Comment';
        }

        var user = {};
        user.first_name = 'Rechat';

        if(results.author)
          user = results.author;

        var base_message = '#' + room.title + ': @' + user.first_name;
        notification.action = 'Sent';
        notification.subject = user.id;
        notification.subject_class = 'User';
        notification.object = message_id;
        notification.object_class = 'Message';
        notification.auxiliary_object = room_id;
        notification.auxiliary_object_class = 'Room';
        notification.message = base_message + aux;
        notification.recommendation = ((message.recommendation) ? message.recommendation : undefined);
        notification.extra_object_class = (message.recommendation) ? 'Recommendation' : null;
        notification.extra_subject_class = sub_aux;
        notification.room = room_id;

        return Notification.issueForRoomExcept(notification, user.id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.message);
  });
};

Message.postSeamless = function(req, cb) {
  var incoming = req.body;

  if(incoming.domain != config.mailgun.domain)
    return cb(Error.Forbidden('Domain is invalid'));

  // if(incoming.token != config.mailgun.token)
  //   return cb(Error.Unauthorized('Invalid credentials'));

  if(!incoming['stripped-text'])
    return cb(Error.Validation('Nothing to post'));

  var author = incoming.from.match("<(.*)>");
  if(!author || !author[1])
    return cb(Error.Validation('Cannot determine the sender of this message'));

  var room = incoming.recipient.match("(.*)@" + config.mailgun.domain);
  if(!room || !room[1])
    return cb(Error.Validation('Cannot determine the destination of this message'));

  Contact.resolve(author[1], undefined, (err, user_id) => {
    if(err)
      return cb(err);

    if(!user_id)
      return cb(Error.Validation('Cannot match senders credentials with any user'));

    Room.get(room[1], (err) => {
      if(err)
        return cb(err);

      var message = {
        author: user_id,
        message_type: 'TopLevel',
        comment: incoming['stripped-text']
      };

      return Message.post(room[1], message, true, cb);
    });
  });
};

/**
 * Retrieves a `message` object
 * @name get
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} message_id - ID of the message being retrieved
 * @param {callback} cb - callback function
 * @returns {Message#message}
 */
Message.get = function(message_id, cb) {
  db.query(sql_get, [message_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var message = res.rows[0];

    async.auto({
      author: cb => {
        if (!message.author)
          return cb();

        User.get(message.author, cb);
      },
      recommendation: cb => {
        if(!message.recommendation)
          return cb();

        Recommendation.get(message.recommendation, cb);
      },
      notification: cb => {
        if(!message.notification)
          return cb();

        Notification.get(message.notification, cb);
      },
      attachments: cb => {
        return async.map(message.attachments, Attachment.get, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      message.author = results.author || null;
      message.recommendation = results.recommendation || null;
      message.notification = results.notification || null;
      message.attachments = results.attachments || null;

      return cb(null, message);
    });
  });
};

/**
 * Retrieves all `message` objects belonging to a `room`
 * @name retrieve
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {Message#message[]}
 */
Message.retrieve = function(room_id, paging, cb) {
  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    db.query(sql_retrieve, [room_id,
                            paging.type,
                            paging.timestamp,
                            paging.limit,
                            paging.recommendation,
                            paging.reference],
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

                 if (res.rows.length > 0)
                   messages[0].total = res.rows[0].total;

                 return cb(null, messages);
               });
             });
  });
};

Message.processSeamless = function(job, cb) {
  var data = job.data;

  async.mapSeries(data.items, (r, cb) => {
    var inner = sprintf(global['seamless_item' + r.type], r);
    return cb(null, inner);
  }, (err, results) => {
    if(err)
      return cb(err);

    var key = Job.getRedisKey(job);

    Job.redis.del(key, (err) => {
      if(err)
        return cb(err);

      data.list = results.join('');
      var params = _u.clone(data);
      params.uri = config.webapp.base_url + '/dashboard/recents/' + data.room_id;
      params.mls_terms = config.webapp.base_url + '/terms/mls';

      delete params.items;

      return Email.send({
        from: 'Rechat <support@' + config.email.seamless_address + '>',
        to: [ data.to ],
        source: config.email.source,
        html_body: seamless_message_body,
        suppress_outer_template: true,
        mailgun_options: {
          'h:Reply-To': data.from
        },
        message: {
          body: {
            html: {
              data: ''
            },
            text: {
              data: ''
            }
          },
          subject: {
            data: data.subject
          }
        },
        template_params: params
      }, cb);
    });
  });
};

/**
 * Stripping the `Message` object off of it's sensitive contents for public consumption
 * @name publicize
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {Message#message} model - message model to be modified
 * @returns {Message#message} modified message object
 */
Message.publicize = function(model) {
  if (model.total) delete model.total;
  if (model.author) User.publicize(model.author);
  if (model.notification) Notification.publicize(model.notification);

  return model;
};

module.exports = function(){};
