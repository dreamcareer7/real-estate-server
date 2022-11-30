const contentDisposition = require('content-disposition')

const config = require('../../config')
const promisify = require('../../utils/promisify')

const getBucket = require('./bucket')
const { isAllowed } = require('./validate')

const invalidTypeErrorMessage = `You can only upload a file with following extensions:
${config.allowed_upload_types.join(', ')}`

const upload = ({key, mime, stream, name, public, extensions}, cb) => {
  if (!isAllowed(name, extensions))
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

  const uploadStream = bucket.s3s.upload(params)

  uploadStream.on('error', err => {
    cb(Error.Amazon(err))
  })

  uploadStream.on('uploaded', (details) => {
    cb(null, {
      key,
      mime,
      name
    })
  })

  stream.pipe(uploadStream)
}

upload.promise = promisify(upload)

module.exports = upload
