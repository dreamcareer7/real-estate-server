const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')

const s3s = {}

s3s.upload = function({
  Bucket,
  Key
}) {
  const file = `/tmp/rechat/${Bucket}${Key}`

  mkdirp.sync(path.dirname(file))

  const writable = fs.createWriteStream(file)

  writable.on('finish', () => {
    writable.emit('uploaded', {})
  })

  return writable
}

const s3 = {}

s3.getObject = ({Bucket, Key}, cb) => {
  const file = `/tmp/rechat/${Bucket}${Key}`

  if (!fs.existsSync(file))
    return cb(new Error('Object does not exist.'))

  cb(null, {
    Body: fs.readFileSync(file)
  })
}

function downloader({params}) {
  const { Bucket, Key } = params
  const file = `/tmp/rechat/${Bucket}${Key}`

  if (!fs.existsSync(file))
    throw new Error('Object does not exist.')
  
  return fs.createReadStream(file)
}

module.exports = { s3s, s3, downloader }
