const { Signer } = require('aws-sdk/clients/cloudfront')
const Mime = require('mime')

const config = require('../../config')
const db = require('../../utils/db')

const getBucket = require('./bucket')
const {
  DEFAULT_MIME,
} = require('./constants')

const PUBLIC = true
const PRIVATE = false

const hasIcons = [
  'application/pdf',
  'video'
]

function setPreview (file) {
  const assets = config.assets + '/mimes/'

  const mime = Mime.getType(file.name) || DEFAULT_MIME

  file.preview_url = assets + 'unknown.png'

  const type = mime.split('/')[0]

  if (type === 'image') {
    file.preview_url = file.url
    return
  }

  if (hasIcons.indexOf(mime) > -1)
    file.preview_url = assets + mime.replace(/\//g, '-') + '.png'

  if (hasIcons.indexOf(type) > -1)
    file.preview_url = assets + type.replace(/\//g, '-') + '.png'
}

const cache = new Map()

function signUrl(file) {
  if (file.public) {
    file.url = getBucket(PUBLIC).config.cdn.url + file.path
    return
  }

  /*
   * Signing files is a CPU intensive process.
   * If we're returning hundreds or thousands of files, it'll the make endpoints
   * slow and also block everything.
   *
   * Therefore, we have a tiny in-memory cache. We generat the url for a file
   * for 24 hours, and we'll reuse it for 23 hours, before skipping it and generating
   * a new one.
   */

  const cached = cache.get(file.id)

  if (cached) {
    const { expireTime, url } = cached

    const isValid = (Date.now() + 60000) < expireTime

    if (isValid) {
      file.url = url
      return
    }
  }

  const bucket = getBucket(PRIVATE)
  const url = bucket.config.cdn.url + file.path
  const expireTime = Date.now() + (1000 * 86400) //Valid for a day.

  const signer = new Signer(
    bucket.config.cdn.keypair.id,
    bucket.config.cdn.keypair.private
  )

  file.url = signer.getSignedUrl({
    url,
    expires: expireTime
  })

  cache.set(file.id, {
    expireTime,
    url: file.url
  })
}

const get = async id => {
  const files = await getAll([id])

  if (files.length < 1)
    throw Error.ResourceNotFound(`File ${id} not found`)

  return files[0]
}

const getAll = async (file_ids) => {
  const res = await db.query.promise('file/get', [file_ids])

  return res.rows.map(r => {
    signUrl(r)
    setPreview(r)
    r.mime = Mime.getType(r.name) || DEFAULT_MIME

    return r
  })
}

module.exports = {
  get,
  getAll,
}
