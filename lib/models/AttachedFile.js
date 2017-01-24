// file.info = {}
// file.info.mime = 'image/png'
// file.info.extension = '.png'
// file.info.mime-extension = .png'
// file.info.size = 303164
// file.info.name = '3552dfbc-4c4b-4427-ad03-598c0630d7f3'
// file.info.title = 'Screen Shot 2016-04-07 at 2.56.02 PM.png'
// file.info.original_title = 'Screen Shot 2016-04-07 at 2.56.02 PM.png'
// file.attributes = {}
// file.attributes.private = true
// file.private = true
// file.metadata = {...EXIF}


const Busboy = require('busboy')

const uuid = require('node-uuid')
const AWS = require('aws-sdk')
const s3 = require('s3-upload-stream')(new AWS.S3())
const async = require('async')
const Mime = require('mime')
const db = require('../utils/db')
const config = require('../config')

const save = ({relations, file, user}, cb) => {
  const relation = (file_id, relation, cb) => {
    db.query('file/relation/save', [
      file_id,
      relation.role,
      relation.id
    ], cb)
  }

  const saveRelations = (cb, results) => {
    async.each(relations, relation.bind(null, results.file.rows[0].id), cb)
  }

  const save = cb => {
    db.query('file/save', [
      file.url,
      file.name,
      user.id
    ], cb)
  }

  async.auto({
    file: save,
    relations: ['file', saveRelations]
  }, cb)
}

AttachedFile = {}

Orm.register('AttachedFile', AttachedFile)

AttachedFile.get = (id, cb) => {
  db.query('file/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('File ' + id + ' not found'))

    const file = res.rows[0]
    setPreview(file)
    file.mime = Mime.lookup(file.name)
    cb(null, file)
  })
}

const hasIcons = [
  'application/pdf',
  'video'
]

function setPreview (file) {
  const assets = config.assets + '/mimes/'

  const mime = Mime.lookup(file.name)
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

const isAllowed = (filename) => {
  const ext = filename.split('.').pop()

  return config.allowed_upload_types.indexOf(ext) > -1
}

const upload = ({bucket, key, mime, stream, name}, cb) => {
  const bucket_name = config.buckets[bucket]

  if (!isAllowed(name))
    return cb(Error.Validation('Uploaded file type is not permitted'))

  const params = {
    Bucket: bucket_name,
    Key: key,
//     ACL: "public-read",
    ContentType: mime,
    ContentDisposition: name
  }

  const upload = s3.upload(params)

  stream.pipe(upload)

  upload.on('error', err => {
    cb(Error.Amazon(err))
  })

  upload.on('uploaded', (details) => {
    const cdn = config.cdns[bucket]
    const url = cdn + key
    cb(null, {
      url,
      mime,
      name
    })
  })
}


AttachedFile.saveFromRequest = ({req, relations, bucket, path}, cb) => {
  const attachFile = (fieldname, file, filename, encoding, mime) => {
    const ext = filename.split('.').pop()
    const key = `${path}/${uuid.v1()}.${ext}`

    upload({
      bucket,
      key,
      stream: file,
      name: filename,
      mime
    }, (err, file) => {
      if (err)
        return cb(err)

      save({
        relations,
        file,
        user: req.user
      }, cb)
    })
  }

  const busboy = new Busboy({
    headers: req.headers,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1
    }
  })

  busboy.on('file', attachFile)
  busboy.on('error', err => cb(err))

  req.pipe(busboy)
}