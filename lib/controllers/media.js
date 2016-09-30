const _u = require('underscore')
const config = require('../config.js')

function uploadMedia (req, res) {
  let target = req.query.type

  if (!target)
    target = 'avatar'

  const types = []

  for (const i in config.buckets) {
    types.push(i.substring(0, i.length - 1))
  }

  if (target && !_u.contains(types, target))
    return res.error(Error.Validation('Upload type not recognized'))

  S3.parseSingleFormData(req, function (err, media) {
    if (err)
      return res.error(err)

    S3.upload(target + 's', media, function (err, upload) {
      if (err)
        return res.error(err)

      return res.json(upload.get)
    })
  })
}

function uploadMediaFake (req, res) {
  console.time('upload')
  S3.parseSingleFormData(req, function (err, media) {
    if (err)
      return res.error(err)

    res.status(200)
    res.json({
      type: 'attachment',
      url: 'http://foobar.org'
    })
    return console.timeEnd('upload')
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/attachments/fake', uploadMediaFake)
  app.post('/attachments', b(uploadMedia))
}

module.exports = router
