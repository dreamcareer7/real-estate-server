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
      enum: [ 'TopLevel', 'SubMessage' ]
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

Message.record = function(message_room, message, cb) {
  validate(message, function(err) {
    if(err)
      return cb(err);

    db.query(sql_record, [message_room,
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

               message = res.rows[0];
               return cb(null, message);
             });
  });
}

module.exports = function(){};