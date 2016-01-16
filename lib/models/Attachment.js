var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');

Attachment = {};

var sql_insert = require('../sql/attachment/insert.sql');
var sql_get    = require('../sql/attachment/get.sql');
var sql_link   = require('../sql/attachment/link.sql');
var sql_unlink = require('../sql/attachment/unlink.sql');

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true
    }
  }
};

var validate = validator.bind(null, schema);

Attachment.create = function(file, cb) {
  db.query(sql_insert, [
    file.user,
    file.url,
    file.metadata,
    file.info
  ], (err, res) => {
    if(err)
      return cb(err);

    return Attachment.get(res.rows[0].id, cb);
  });
};

Attachment.link = function(object_id, attachment_id, cb) {
  db.query(sql_link, [object_id, attachment_id], (err, res) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Attachment.unlink = function(object_id, attachment_id, cb) {
  db.query(sql_unlink, [object_id, attachment_id], (err, res) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Attachment.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Attachment not found'));

    return cb(null, res.rows[0]);
  });
};

module.exports = function(){};
