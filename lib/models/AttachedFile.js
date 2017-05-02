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
const s3 = new AWS.S3()
const s3s = require('s3-upload-stream')(s3)
const async = require('async')
const Mime = require('mime')
const cf = require('aws-cloudfront-sign')
const db = require('../utils/db')
const config = require('../config')
const request = require('request')

AttachedFile = {}

const bucket = config.buckets.private

Orm.register('file', AttachedFile)


AttachedFile.get = (id, cb) => {
  AttachedFile.getAll([id], (err, files) => {
    if (err)
      return cb(err)

    if (files.length < 1)
      return cb(Error.ResourceNotFound('File ' + id + ' not found'))

    const file = files[0]
    cb(null, file)
  })
}

AttachedFile.getAll = (file_ids, cb) => {
  db.query('file/get', [file_ids], (err, res) => {
    if (err)
      return cb(err)

    const files = res.rows.map(r => {
      signUrl(r)
      setPreview(r)
      r.mime = Mime.lookup(r.name)

      return r
    })

    return cb(null, files)
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

function signUrl(file) {
  const url = config.cdns.private + file.path

  const options = {
    keypairId: config.cloudfront.keypair.id,
    privateKeyString: config.cloudfront.keypair.private,
    expireTime: Number(new Date()) + (900 * 1000) //Valid for an 15 mins.
  }

  file.url = cf.getSignedUrl(url, options)
}

const isAllowed = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()

  return config.allowed_upload_types.indexOf(ext) > -1
}

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
      file.key,
      file.name,
      user.id
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    AttachedFile.get(results.file.rows[0].id, cb)
  }

  async.auto({
    file: save,
    relations: ['file', saveRelations]
  }, done)
}

const upload = ({key, mime, stream, name}, cb) => {
  if (!isAllowed(name))
    return cb(Error.Validation(`Uploaded file ${name} is not permitted to be saved.`))

  const params = {
    Bucket: bucket,
    Key: key,
//     ACL: "public-read",
    ContentType: mime,
    ContentDisposition: name
  }

  const upload = s3s.upload(params)

  stream.pipe(upload)

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
}


AttachedFile.saveFromRequest = ({req, relations, path}, cb) => {
  const attachFile = (fieldname, file, filename, encoding, mime) => {
    const ext = filename.split('.').pop()
    const key = `${path}/${uuid.v1()}.${ext}`

    upload({
      key,
      stream: file,
      name: filename,
      mime: Mime.lookup(filename)
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

AttachedFile.saveFromUrl = ({url, filename, relations, path, user}, cb) => {
  const ext = filename.split('.').pop()
  const key = `${path}/${uuid.v1()}.${ext}`

  const stream = request(url)

  const cancel = (err) => {
    stream.emit('error', err)
  }

  stream.on('response', res => {
    if (res.statusCode === 200)
      return

    cancel(`Got ${res.statusCode} while downloading ${JSON.stringify(url)}`)
  })

  upload({
    key,
    stream: stream,
    name: filename,
    mime: Mime.lookup(filename)
  }, (err, file) => {
    if (err)
      return cb(err)

    save({
      relations,
      file,
      user
    }, cb)
  })
}

AttachedFile.download = (file_id, cb) => {
  AttachedFile.get(file_id, (err, file) => {
    if (err)
      return cb(err)

    s3.getObject({
      Bucket: bucket,
      Key: file.path
    }, (err, file) => {
      if (err)
        return cb(Error.Amazon(err))

      cb(null, file.Body)
    })
  })
}
