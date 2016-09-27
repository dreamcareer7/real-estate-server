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
var moment       = require('moment');
var request      = require('request');

var sql_post     = require('../sql/message/post.sql');
var sql_get      = require('../sql/message/get.sql');
var sql_retrieve = require('../sql/message/retrieve.sql');
var sql_unread   = require('../sql/message/unread.sql');

Message = new EventEmitter;

Orm.register('message', Message);

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
    check_recommendation: [
      'recommendation',
      (cb, results) => {
        if(results.recommendation && results.recommendation.room != room_id)
          return cb(Error.Validation('Cannot mention a recommendation which belongs to another room.'));

        return cb();
      }
    ],
    mentions: cb => {
      if(!message.mentions)
        return cb();

      return async.map(message.mentions, User.get, cb);
    },
    listing: [
      'recommendation',
      (cb, results) => {
        if(!message.recommendation)
          return cb();

        return Listing.get(results.recommendation.listing, cb);
      }
    ],
    users: cb => {
      return Room.getUsers(room_id, cb);
    },
    is_member: [
      'room',
      'author',
      'users',
      (cb, results) => {
        if (!Room.belongs(results.users, message.author))
          return cb(Error.Forbidden('User is not a member of this room'));

        return cb();
      }
    ],
    post: [
      'is_member',
      'validate',
      'mentions',
      'check_recommendation',
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
        var address_line = (message.recommendation) ? Address.getLocalized(results.listing.property.address) : '';

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

        var base_message = '#' + room.proposed_title + ': @' + user.first_name;
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

Message.postSeamless = function(incoming, cb) {
  if(incoming.domain != config.mailgun.domain)
    return cb(Error.Forbidden('Domain is invalid'));

  var e = () => {
    return Error.NotAcceptable('Cannot determine the sender or receiver of this message');
  };

  if(!incoming['stripped-text'])
    return cb(Error.NotAcceptable('Nothing to post'));

  var to = incoming.recipient.match('(.*)@');
  if(!to || !to[1])
    return cb(e());

  try {
    var decrypted = JSON.parse(Crypto.decrypt(to[1]));

    var room_id = decrypted.room_id;
    var user_id = decrypted.user_id;
  } catch(err) {
    return cb(Error.NotAcceptable('Invalid reply token'));
  }

  if(!room_id || !user_id)
    return cb(e());

  var attach = (attachment, cb) => {
    var got = (err, response, body) => {
      if(err)
        return cb(err);

      var ext = attachment.name.split('.').pop();

      S3.upload('attachments', {
        attachment:true,
        ext:ext,
        info: {
          'mime-extension':ext,
          mime:attachment['content-type'],
          original_name:attachment.name
        },
        attributes:{private:true},
        body:body
      }, (err, a) => {
        if(err)
          return cb(err);

        return cb(null, a.attachment.id);
      });
    };

    var r = request.get({
      url: attachment.url,
      encoding: null
    }, got).auth('api', config.mailgun.api_key);
  };

  var attachments = (cb, results) => {
    try {
      var attachments = JSON.parse(incoming.attachments).filter( a => Attachment.isAllowed(a.name, a.size ) );
    } catch (e) {
      attachments = [];
    }

    async.map(attachments, attach, cb);
  };

  var message = (cb, results) => {
    var message = {
      author: results.user.id,
      message_type: 'TopLevel',
      comment: incoming['stripped-text'],
      attachments: results.attachments
    };

    Message.post(room_id, message, true, cb);
  };

  async.auto({
    user:        cb => User.get(user_id, cb),
    room:        cb => Room.get(room_id, cb),
    attachments: ['user', 'room', attachments],
    message:     ['attachments', message]
  }, cb);
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
    cb(null, message);
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

  return model;
};

Message.associations = {
  author: {
    optional: true,
    model: 'User'
  },

  recommendation: {
    optional: true,
    model: 'Recommendation'
  },

  notification: {
    optional: true,
    model: 'Notification'
  },

  attachments: {
    collection: true,
    model: 'Attachment',
    default_value: ()=>[]
  },

  room: {
    model: 'Room',
    enabled: false
  }
};


var sendStackedEmail = (user_id, room_id, first, last, cb) => {
  var now = (new Date()).getTime() / 1000;

  if ( (now - last) < (config.email.seamless_delay / 1000) )
    return cb();

  var saveDelivery = (cb, results) => {
    Notification.getUnreadForRoom(user_id, room_id, (err, notifications) => {
      if(err)
        return cb(err);

      async.map(notifications, (n, cb) => {
        Notification.saveDelivery(n.id, results.user.id, results.user.email, 'email', cb );
      }, cb);
    });
  };

  var send = (cb, results) => {
    var replyTo = Crypto.encrypt(JSON.stringify({
      room_id:room_id,
      user_id:results.user.id
    })) + '@' + config.email.seamless_address;

    Email.send({
      from: 'Rechat <' + config.email.from + '>',
      to: [ results.user.email ],
      source: config.email.source,
      html_body: results.html,
      suppress_outer_template: true,
      mailgun_options: {
        'h:Reply-To': replyTo,
        'h:In-Reply-To': '<invitation-room-' + room_id + '@rechat.com>'
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
          data: '[Rechat] ' + results.room.proposed_title
        }
      },
      template_params: {
        uri: results.branch,
        mls_terms: config.webapp.base_url + '/terms/mls'
      }
    }, cb);
  };


  var getMessages = (cb, results) => {
    Message.retrieve(room_id, {
      type: 'Since_C',
      timestamp: (first-1) * 1000000,
      recommendation: 'None',
      reference: 'None'
    }, (err, messages) => {
      var cache = {};
      async.map(messages, (m, cb) => {
        Orm.populate(m, cache, cb, ['message.room', 'message.notification']);
      }, (err, messages) => {
        if(err)
          return cb(err);

        // If message has no author but its a recommendation, it should not be shown, as we will show it as a SubLevel message

        messages = messages.filter(m => {
          if (m.author)
            return true;

          if (message.notification && !Notification.isSystemGenerated(message.notification))
            return true;
        });

        if(messages.length < 1)
          return cb(Error.NotImplemented('No message to send on seamless email to user ' + user_id));

        messages.forEach( m => {
          m.time = moment(m.created_at*1000).tz(results.user.timezone).format('lll');

          if(!m.recommendation)
            return ;

          var l = m.recommendation.listing;
          l.property.address       = Address.getLocalized(l.property.address);
          l.price                  = Listing.priceHumanReadable(l.price);
          l.property.square_meters = Listing.getSquareFeet(l.property.square_meters);
        });

        return cb(null, messages);
      });
    });
  };

  var getToken = (cb, results) => {
    Token.getOrCreateForUserFull(results.user.id, (err, tokens) => {
      if(err)
        return cb(err);

      var token = Crypto.encrypt(JSON.stringify({
        id: results.user.id,
        tokens: tokens
      }));

      return cb(null, token);
    });
  };

  var getBranch = (cb, results) => {
    var desktop_url = config.webapp.base_url + '/dashboard/recents/' + room_id + '?token=' + encodeURIComponent(results.token);

    var b = {};
    b.room = room_id;
    b.action = 'RedirectToRoom';
    b.transport = 'email';
    b.to = results.user.email;
    b['$desktop_url'] = desktop_url;
    b['$fallback_url'] = desktop_url;

    Branch.createURL(b, cb);
  };

  var renderEmail = (cb, results) => {
    Template.render(__dirname + '/../html/message/body.html', results, cb)
  };

  var report = (err) => {
    if(!err)
      return cb();

    if(err.http === 501)
      return cb();

    cb(err);
  };

  async.auto({
    user:     cb => User.get(user_id, cb),
    messages: ['user', getMessages],
    room:     cb => Room.get(room_id, cb),
    room_users: cb => Room.getUsers(room_id, cb),
    token:    ['user', getToken],
    branch:   ['token', getBranch],
    html:     ['branch', 'messages', renderEmail],
    delivery: ['html', saveDelivery],
    send:     ['html', 'room', 'delivery', 'room_users', send]
  }, report);
};

Message.sendEmailForUnread = (cb) => {
  db.query(sql_unread, [], (err, res) => {
    if (err)
      return cb(err);

    async.forEach(res.rows, (r, cb) => {
      sendStackedEmail(r.user, r.room, r.first_unread, r.last_unread, cb);
    }, cb);
  });
};

module.exports = function(){};
