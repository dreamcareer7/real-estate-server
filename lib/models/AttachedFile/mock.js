const stream = require('stream')

const s3s = {}

s3s.upload = () => {
  const writable = new stream.Writable({
    write: function(chunk, encoding, next) {
      next()
    }
  })

  writable.on('finish', () => {
    writable.emit('uploaded', {})
  })

  return writable
}

const s3 = {}

s3.getObject = (options, cb) => {
  cb(null, {
    Body: new Buffer('Mocked S3')
  })
}

module.exports = { s3s, s3 }

