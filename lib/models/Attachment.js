const db = require('../utils/db.js')
const config = require('../../lib/config.js')

Attachment = {}

Orm.register('attachment', 'Attachment')

Attachment.isAllowed = (filename, size) => {
  const ext = filename.split('.').pop()

  return config.allowed_upload_types.indexOf(ext) > -1
}

Attachment.create = function (file, cb) {
  db.query('attachment/insert', [
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
  db.query('attachment/link', [object_id, attachment_id], (err, res) => {
    if (err)
      return cb(err)

    return cb()
  })
}

Attachment.unlink = function (object_id, attachment_id, cb) {
  db.query('attachment/unlink', [object_id, attachment_id], (err, res) => {
    if (err)
      return cb(err)

    return cb()
  })
}

Attachment.get = function (id, cb) {
  Attachment.getAll([id], (err, attachments) => {
    if(err)
      return cb(err)

    if (attachments.length < 1)
      return cb(Error.ResourceNotFound(`Attachment ${id} not found`))

    const attachment = attachments[0]

    return cb(null, attachment)
  })
}

Attachment.getAll = function(attachment_ids, cb) {
  db.query('attachment/get', [attachment_ids], (err, res) => {
    if (err)
      return cb(err)

    const attachments = res.rows.map(r => {
      if (r.info)
        r.info['type'] = 'attachment_info'

      if (r.metadata)
        r.metadata['type'] = 'attachment_metadata'

      if (r.attributes)
        r.attributes['type'] = 'attachment_attributes'

      setPreview(r)

      return r
    })

    return cb(null, attachments)
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

  if (type === 'image') {
    attachment.preview_url = attachment.url
    return
  }

  if (hasIcons.indexOf(mime) > -1)
    attachment.preview_url = assets + mime.replace(/\//g, '-') + '.png'

  if (hasIcons.indexOf(type) > -1)
    attachment.preview_url = assets + type.replace(/\//g, '-') + '.png'
}

module.exports = function () {}
