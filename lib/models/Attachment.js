var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');

Attachment = {};

var sql_insert = require('../sql/attachment/insert.sql');
var sql_get    = require('../sql/attachment/get.sql');

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

Attachment.create = function(file, url, cb) {
  db.query(sql_insert, [
    file.user,
    url,
    file.metadata
  ], cb);
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
