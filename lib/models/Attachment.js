var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');
var config    = require('../../lib/config.js');

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
    file.info,
    file.attributes,
    file.attributes.private
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

    var attachment = res.rows[0];

    if(attachment.info)
      attachment.info['type'] = 'attachment_info';
    if(attachment.metadata)
      attachment.metadata['type'] = 'attachment_metadata';
    if(attachment.attributes)
      attachment.attributes['type'] = 'attachment_attributes';


    setPreview(attachment);

    return cb(null, attachment);
  });
};

var hasIcons = [
  'application/pdf',
  'video'
]

function setPreview(attachment) {
  var assets = config.assets + '/mimes/';

  attachment.preview_url = assets + 'unknown.png';

  if(!attachment.info || !attachment.info.mime)
    return ;

  var mime = attachment.info.mime;
  var type = mime.split('/')[0];

  if(type === 'image')
    return attachment.preview_url = attachment.url;

  if(hasIcons.indexOf(mime) > -1)
    attachment.preview_url = assets + mime.replace(/\//g, '-') + '.png';

  if(hasIcons.indexOf(type) > -1)
    attachment.preview_url = assets + type.replace(/\//g, '-') + '.png';
}

module.exports = function(){};
