const db = require('../utils/db.js')
const config = require('../../lib/config.js')

Attachment = {}

const sql_insert = require('../sql/attachment/insert.sql')
const sql_get = require('../sql/attachment/get.sql')
const sql_link = require('../sql/attachment/link.sql')
const sql_unlink = require('../sql/attachment/unlink.sql')

Attachment.isAllowed = (filename, size) => {
  const ext = filename.split('.').pop()

  return config.allowed_upload_types.indexOf(ext) > -1
}

Attachment.create = function (file, cb) {
  db.query(sql_insert, [
    file.user,
    file.url,
    file.metadata,
    file.info,
    file.attributes,
    file.attributes.private
  ], (err, res) => {
    if (err)
      return cb(err)

    return Attachment.get(res.rows[0].id, cb)
  })
}

Attachment.link = function (object_id, attachment_id, cb) {
  db.query(sql_link, [object_id, attachment_id], (err, res) => {
    if (err)
      return cb(err)

    return cb()
  })
}

Attachment.unlink = function (object_id, attachment_id, cb) {
  db.query(sql_unlink, [object_id, attachment_id], (err, res) => {
    if (err)
      return cb(err)

    return cb()
  })
}

Attachment.get = function (id, cb) {
  db.query(sql_get, [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Attachment not found'))

    const attachment = res.rows[0]

    if (attachment.info)
      attachment.info['type'] = 'attachment_info'
    if (attachment.metadata)
      attachment.metadata['type'] = 'attachment_metadata'
    if (attachment.attributes)
      attachment.attributes['type'] = 'attachment_attributes'

    setPreview(attachment)

    return cb(null, attachment)
  })
}

const hasIcons = [
  'application/pdf',
  'video'
]

function setPreview (attachment) {
  const assets = config.assets + '/mimes/'

  attachment.preview_url = assets + 'unknown.png'

  if (!attachment.info || !attachment.info.mime)
    return

  const mime = attachment.info.mime
  const type = mime.split('/')[0]

  if (type === 'image')
    return attachment.preview_url = attachment.url

  if (hasIcons.indexOf(mime) > -1)
    attachment.preview_url = assets + mime.replace(/\//g, '-') + '.png'

  if (hasIcons.indexOf(type) > -1)
    attachment.preview_url = assets + type.replace(/\//g, '-') + '.png'
}

module.exports = function () {}
