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

module.exports = { s3s }

