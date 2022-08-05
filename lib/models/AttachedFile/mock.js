const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const Nock = require('nock')
const instaNock = Nock('http://insta.com/')

instaNock.get(/.*/).reply(200)

instaNock.persist()

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
    return cb(new Error(`Object ${file} does not exist.`))

  cb(null, {
    Body: fs.readFileSync(file)
  })
}

s3.createPresignedPost = ({Bucket, Fields}, cb) => {
  const file = `/tmp/rechat/${Bucket}${Fields.key}`

  mkdirp.sync(path.dirname(file))

  fs.writeFileSync(file, '')

  const res = {
    key: Fields.key,
    url: 'http://upload-bucket'
  }

  cb(null, res)
}

function downloader({params}) {
  const { Bucket, Key } = params
  const file = `/tmp/rechat/${Bucket}${Key}`

  if (!fs.existsSync(file))
    throw new Error('Object does not exist.')
  
  return fs.createReadStream(file)
}

module.exports = { s3s, s3, downloader }
