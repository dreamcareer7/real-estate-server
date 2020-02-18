const Busboy = require('busboy')

const uuid = require('node-uuid')
const async = require('async')
const Mime = require('mime')
const cf = require('aws-cloudfront-sign')
const Stream = require('stream')
const contentDisposition = require('content-disposition')
const db = require('../../utils/db')
const config = require('../../config')
const request = require('request')
const prequest = require('request-promise-native')
const fixHeroku = require('../../utils/fix-heroku')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')
const getBucket = require('./bucket')

const Orm = require('../Orm')

/*
 * Based on RFC 2046 section 4.5.1:
 * application/octet-stream is default mime type
 */

const DEFAULT_MIME = 'application/octet-stream'

const PUBLIC = true
const PRIVATE = false

const AttachedFile = {}
global['AttachedFile'] = AttachedFile

Orm.register('file', 'AttachedFile', AttachedFile)

AttachedFile.get = async id => {
  const files = await AttachedFile.getAll([id])

  if (files.length < 1)
    throw Error.ResourceNotFound(`File ${id} not found`)

  return files[0]
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
    console.log(getBucket(PUBLIC))
    file.url = getBucket(PUBLIC).config.cdn.url + file.path
    return
  }

  const bucket = getBucket(PRIVATE)
  const url = bucket.config.cdn.url + file.path

  const options = {
    keypairId: bucket.config.cdn.keypair.id,
    privateKeyString: bucket.config.cdn.keypair.private,
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
  await AttachedFile.unlinkMany([
    { file, role, role_id }
  ])
}

AttachedFile.unlinkMany = async links => {
  await db.query.promise('file/relation/delete', [
    JSON.stringify(links)
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
      user ? user.id : null,
      public
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    AttachedFile.get(results.file.rows[0].id).nodeify(cb)
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

  const bucket = getBucket(public)

  const params = {
    Bucket: bucket.config.name,
    Key: key,
    ContentType: mime,
    ContentDisposition,
    CacheControl: 'max-age=15552000' // 6 months
  }

  const upload = bucket.s3s.upload(params)

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

AttachedFile.preSave = async ({
  filename,
  relations,
  path,
  keyname = uuid.v1(),
  user,
  public = false
}) => {
  if (!AttachedFile.isAllowed(filename))
    throw Error.Validation(`Uploaded file ${filename} is not permitted to be saved.`)

  const ext = filename.split('.').pop()

  const key = `${path}/${keyname}.${ext}`

  const bucket = getBucket(public)
  const params = {
    Bucket: bucket.name,
    Fields: {
      key,
      'Content-Type': Mime.getType(filename) || DEFAULT_MIME,
    },
    Conditions: [
      ['starts-with', '$key', key]
    ]
  }

  const presigned = await promisify(bucket.s3.createPresignedPost.bind(bucket.s3))(params)

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

AttachedFile.saveFromRequest = ({
  req,
  relations,
  path,
  keyname = uuid.v1(),
  public = undefined,
  busboyOptions = {}
}, cb) => {
  /*
   * Requests can have 3 forms:
   * 1. A multipart file upload.
   *
   * 2. A JSON of {file} where file is an id of the original file
   * which will be copied into the new file.
   *
   * 3. A JSON of {url, filename}
   * The url will be downloaded and re-uploaded for the new file.
   *
   */

  const fromUrl = ({url, filename}) => {
    AttachedFile.saveFromUrl({
      url,
      filename,
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
  }

  const fromFile = file => {
    AttachedFile.get(req.body.file).nodeify((err, file) => {
      if (err)
        return cb(err)

      fromUrl({
        url: file.url,
        filename: file.name
      })
    })
  }

  const { file, url, filename } = req.body

  if (file)
    return fromFile(file)

  if (url) {
    expect(filename).to.be.a('string')

    return fromUrl({
      url,
      filename
    })
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
    const key = `${path}/${keyname}.${ext}`

    file.on('limit', function(){
      throw Error.Validation('File size exceeds')
    })

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
    },
    ...busboyOptions
  })

  const setField = (name, val) => {
    fields[name] = val
  }

  busboy.on('file', attachFile)
  busboy.on('error', err => cb(err))
  busboy.on('field', setField)

  req.pipe(busboy)
}

AttachedFile.saveFromUrl = ({
  url,
  filename,
  relations,
  path,
  keyname = uuid.v1(),
  user,
  public = false
}, cb) => {
  const ext = filename.split('.').pop()
  const key = `${path}/${keyname}.${ext}`

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

AttachedFile.saveFromStream = async ({
  filename,
  relations,
  path,
  keyname = uuid.v1(),
  user,
  public = false,
  stream
}) => {
  const ext = filename.split('.').pop()
  const key = `${path}/${keyname}.${ext}`

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

AttachedFile.saveFromBuffer = async ({
  filename,
  relations,
  path,
  user,
  public = false,
  keyname = uuid.v1(),
  buffer
}) => {
  const stream = new Stream.PassThrough()
  stream.end(buffer)

  return AttachedFile.saveFromStream({
    filename,
    relations,
    path,
    user,
    public,
    keyname,
    stream
  })
}

AttachedFile.download = (file_id, cb) => {
  AttachedFile.get(file_id).nodeify((err, file) => {
    if (err)
      return cb(err)

    const bucket = getBucket(file.public)

    bucket.s3.getObject({
      Bucket: bucket.config.name,
      Key: file.path
    }, (err, file) => {
      if (err)
        return cb(Error.Amazon(err))

      cb(null, file.Body)
    })
  })
}

AttachedFile.downloadAsStream = async (file) => {
  const bucket = getBucket(file.public)

  const config = {
    client: bucket.s3,
    concurrency: 2,
    params: {
      Bucket: bucket.config.name,
      Key: file.path
    }
  }

  return bucket.downloader(config)
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

AttachedFile.getFileSize = async file => {
  if (process.env.NODE_ENV === 'tests')
    return 1024 * 1024

  const result = await prequest.head({
    url: file.url,
    encoding: 'binary'
  })

  return Number(result['content-length'])
}


module.exports = AttachedFile
