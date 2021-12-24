const contentDisposition = require('content-disposition')

const config = require('../../config')
const promisify = require('../../utils/promisify')

const getBucket = require('./bucket')
const { isAllowed } = require('./validate')

const invalidTypeErrorMessage = `You can only upload a file with following extensions:
${config.allowed_upload_types.join(', ')}`

const upload = ({key, mime, stream, name, public}, cb) => {
  if (!isAllowed(name))
    return cb(Error.Validation(invalidTypeErrorMessage))

  /* eslint-disable-next-line */
  const fallback = name.replace(name, /[^\x00-\x7F]/ig, '?')

  const ContentDisposition = contentDisposition(name, {
    type: 'inline',
    fallback
  })

  const bucket = getBucket(public)

  const params = {
    Bucket: bucket.config.name,
    Key: key,
    ContentType: mime,
    ContentDisposition,
    CacheControl: 'max-age=15552000' // 6 months
  }

  const upload = bucket.s3s.upload(params)

  upload.on('error', err => {
    cb(Error.Amazon(err))
  })

  upload.on('uploaded', (details) => {
    cb(null, {
      key,
      mime,
      name
    })
  })

  stream.pipe(upload)
}

upload.promise = promisify(upload)

module.exports = upload
