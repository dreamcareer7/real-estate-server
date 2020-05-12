const AWS = require('aws-sdk')
const UploadStream = require('s3-upload-stream')
const DownloadStream = require('s3-download-stream')
const Config = require('../../config')

const buckets = {}

const createBucket = name => {
  const config = Config.buckets[name]

  if(buckets[name])
    return buckets[name]

  if (process.env.NODE_ENV === 'tests') {
    const mock = require('./mock')

    const bucket = {
      s3: mock.s3,
      s3s: mock.s3s,
      downloader: mock.downloader,
      config
    }

    buckets[name] = bucket
    return bucket
  }

  const s3 = new AWS.S3({
    region: config.region
  })
  const s3s = UploadStream(s3)
  const downloader = DownloadStream

  const bucket = {
    s3,
    s3s,
    downloader,
    config
  }

  buckets[name] = bucket
  return bucket
}

const getBucket = (public = false) => {
  if (public)
    return createBucket('public')

  return createBucket('private')
}

module.exports = getBucket
