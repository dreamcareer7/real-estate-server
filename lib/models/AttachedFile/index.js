const Busboy = require('busboy')

const uuid = require('node-uuid')
const AWS = require('aws-sdk')
const async = require('async')
const Mime = require('mime')
const cf = require('aws-cloudfront-sign')
const Stream = require('stream')
const contentDisposition = require('content-disposition')
const db = require('../../utils/db')
const config = require('../../config')
const request = require('request')
const fixHeroku = require('../../utils/fix-heroku')
const promisify = require('../../utils/promisify')

const Orm = require('../Orm')

let s3 = new AWS.S3()
let s3s = require('s3-upload-stream')(s3)
let downloader = require('s3-download-stream')

/*
 * Based on RFC 2046 section 4.5.1:
 * application/octet-stream is default mime type
 */

const DEFAULT_MIME = 'application/octet-stream'

if (process.env.NODE_ENV === 'tests') {
  const mock = require('./mock')
  s3 = mock.s3
  s3s = mock.s3s
  downloader = mock.downloader
}

const AttachedFile = {}
global['AttachedFile'] = AttachedFile

Orm.register('file', 'AttachedFile', AttachedFile)

const private_bucket = config.buckets.private
const public_bucket = config.buckets.public

AttachedFile.get = (id, cb) => {
  AttachedFile.getAll([id]).nodeify((err, files) => {
    if (err)
      return cb(err)

    if (files.length < 1)
      return cb(Error.ResourceNotFound('File ' + id + ' not found'))

    const file = files[0]
    cb(null, file)
  })
}

AttachedFile.getAll = async (file_ids) => {
  const res = await db.query.promise('file/get', [file_ids])

  return res.rows.map(r => {
    signUrl(r)
    setPreview(r)
    r.mime = Mime.getType(r.name) || DEFAULT_MIME

    return r
  })
}

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

function signUrl(file) {
  if (file.public) {
    file.url = config.cdns.public + file.path
    return
  }

  const url = config.cdns.private + file.path

  const options = {
    keypairId: config.cloudfront.keypair.id,
    privateKeyString: config.cloudfront.keypair.private,
    expireTime: Number(new Date()) + (1000 * 86400) //Valid for a day.
  }

  file.url = cf.getSignedUrl(url, options)
}

AttachedFile.isAllowed = filename => {
  const ext = filename.split('.').pop().toLowerCase()

  return config.allowed_upload_types.indexOf(ext) > -1
}

AttachedFile.linkMany = async links => {
  await db.query.promise('file/relation/save', [JSON.stringify(links)])
}

AttachedFile.unlink = async (file, role, role_id) => {
  await db.query.promise('file/relation/delete', [
    file,
    role,
    role_id
  ])
}

const save = ({relations = [], file, user, public}, cb) => {
  const saveRelations = (cb, results) => {
    AttachedFile.linkMany(relations.map(relation => {
      return {
        ...relation,
        file: results.file.rows[0].id
      }
    })).nodeify(cb)
  }

  const save = cb => {
    db.query('file/save', [
      file.key,
      file.name,
      user.id,
      public
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

const upload = ({key, mime, stream, name, public}, cb) => {
  if (!AttachedFile.isAllowed(name))
    return cb(Error.Validation(`Uploaded file ${name} is not permitted to be saved.`))

  /* eslint-disable-next-line */
  const fallback = name.replace(name, /[^\x00-\x7F]/ig, '?')

  const ContentDisposition = contentDisposition(name, {
    type: 'inline',
    fallback
  })

  const params = {
    Bucket: public ? public_bucket : private_bucket,
    Key: key,
    ContentType: mime,
    ContentDisposition,
    CacheControl: 'max-age=15552000' // 6 months
  }

  const upload = s3s.upload(params)

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

  stream.pipe(upload)
}

AttachedFile.preSave = async ({filename, relations, path, user, public = false}) => {
  if (!AttachedFile.isAllowed(filename))
    throw Error.Validation(`Uploaded file ${filename} is not permitted to be saved.`)

  const ext = filename.split('.').pop()

  const key = `${path}/${uuid.v1()}.${ext}`

  const params = {
    Bucket: public ? public_bucket : private_bucket,
    Fields: {
      key,
      'Content-Type': Mime.getType(filename) || DEFAULT_MIME,
    },
    Conditions: [
      ['starts-with', '$key', key]
    ]
  }

  const presigned = await promisify(s3.createPresignedPost.bind(s3))(params)

  const file = await promisify(save)({
    relations,
    file: {
      key,
      name: filename
    },
    user,
    public
  })

  return {
    file,
    presigned: {
      key,
      ...presigned
    }
  }
}

AttachedFile.saveFromRequest = ({req, relations, path, public = undefined}, cb) => {
  /*
   * Requests can have 2 forms:
   * 1. A JSON which includes `{url}` in the body.
   * In that case, the url will be downloaded and re-uploaded to the destination.
   *
   * 2. A multipart file upload.
   */
  if (req.body && req.body.file) {
    AttachedFile.get(req.body.file, (err, file) => {
      if (err)
        return cb(err)

      AttachedFile.saveFromUrl({
        url: file.url,
        filename: file.name,
        relations,
        path,
        user: req.user,
        public
      }, (err, file) => {
        if (err)
          return cb(err)

        const fields = req.body

        cb(null, {file, fields})
      })
    })
    return
  }

  fixHeroku(req)

  const fields = {}

  const attachFile = (fieldname, file, filename, encoding, mime) => {
    /*
     * If the caller sets a public parameter to true/false, use that.
     * If its not set (its undefined), consider client-defined value
     */
    if (public === undefined)
      public = Boolean(fields.public)

    const ext = filename.split('.').pop()
    const key = `${path}/${uuid.v1()}.${ext}`

    upload({
      key,
      public,
      stream: file,
      name: filename,
      mime: Mime.getType(filename) || DEFAULT_MIME,
    }, (err, file) => {
      if (err)
        return cb(err)

      save({
        relations,
        file,
        public,
        user: req.user,
      }, (err, file) => {
        if (err)
          return cb(err)

        return cb(null, {file, fields})
      })
    })
  }

  const busboy = new Busboy({
    headers: req.headers,
    limits: {
      fileSize: 200 * 1024 * 1024,
      files: 1
    }
  })

  const setField = (name, val) => {
    fields[name] = val
  }

  busboy.on('file', attachFile)
  busboy.on('error', err => cb(err))
  busboy.on('field', setField)

  req.pipe(busboy)
}

AttachedFile.saveFromUrl = ({url, filename, relations, path, user, public = false}, cb) => {
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
    mime: Mime.getType(filename) || DEFAULT_MIME,
    public
  }, (err, file) => {
    if (err)
      return cb(err)

    save({
      relations,
      file,
      user,
      public
    }, cb)
  })
}

AttachedFile.saveFromStream = async ({filename, relations, path, user, public = false, stream}) => {
  const ext = filename.split('.').pop()
  const key = `${path}/${uuid.v1()}.${ext}`

  const file = await promisify(upload)({
    key,
    stream: stream,
    name: filename,
    mime: Mime.getType(filename) || DEFAULT_MIME,
    public
  })

  return promisify(save)({
    relations,
    file,
    user,
    public
  })
}

AttachedFile.saveFromBuffer = async ({filename, relations, path, user, public = false, buffer}) => {
  const stream = new Stream.PassThrough()
  stream.end(buffer)

  return AttachedFile.saveFromStream({
    filename,
    relations,
    path,
    user,
    public,
    stream
  })
}

AttachedFile.download = (file_id, cb) => {
  AttachedFile.get(file_id, (err, file) => {
    if (err)
      return cb(err)

    s3.getObject({
      Bucket: file.public ? public_bucket : private_bucket,
      Key: file.path
    }, (err, file) => {
      if (err)
        return cb(Error.Amazon(err))

      cb(null, file.Body)
    })
  })
}

AttachedFile.downloadAsStream = async (file_id) => {
  const file = await promisify(AttachedFile.get)(file_id)

  const config = {
    client: s3,
    concurrency: 2,
    params: {
      Bucket: file.public ? public_bucket : private_bucket,
      Key: file.path
    }
  }

  return downloader(config)
}

AttachedFile.delete = (file_id, cb) => {
  db.query('file/remove', [file_id], cb)
}

AttachedFile.getByRole = async (role, role_id) => {
  return db.selectIds('file/get_role_files', [
    role,
    role_id
  ])
}

AttachedFile.getRelations = async file_id => {
  const res = await db.query.promise('file/get-relations', [file_id])
  return res.rows
}

module.exports = AttachedFile
