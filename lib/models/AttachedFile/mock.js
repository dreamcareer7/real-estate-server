const EventEmitter = require('events').EventEmitter

const s3s = {}

s3s.upload = () => {
  const ee = new EventEmitter

  process.nextTick(() => {
    ee.emit('uploaded')
  })

  ee.end = () => {}

  return ee
}

const s3 = {}

s3.getObject = (options, cb) => {
  cb(null, {
    Body: new Buffer('Mocked S3')
  })
}

module.exports = { s3s, s3 }

