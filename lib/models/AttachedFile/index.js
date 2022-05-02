const Busboy = require('busboy')

const uuid = require('uuid')
const async = require('async')
const Mime = require('mime')
const Stream = require('stream')
const numeral = require('numeral')
const db = require('../../utils/db')
const config = require('../../config')
const request = require('request')
const concat = require('concat-stream')
const prequest = require('request-promise-native')
const fixHeroku = require('../../utils/fix-heroku')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')
const getBucket = require('./bucket')
const upload = require('./upload')
const { isAllowed } = require('./validate')

if (process.env.NODE_ENV === 'tests') 
  require('./mock')

const {
  DEFAULT_MIME,
} = require('./constants')


const AttachedFile = {
  ...require('./get'),
  isAllowed
}

const invalidTypeErrorMessage = `You can only upload a file with following extensions:
${config.allowed_upload_types.join(', ')}`

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

AttachedFile.preSave = async ({
  filename,
  relations,
  path,
  keyname = uuid.v1(),
  user,
  public = false
}) => {
  if (!isAllowed(filename))
    throw Error.Validation(invalidTypeErrorMessage)

  const ext = filename.split('.').pop()

  const key = `${path}/${keyname}.${ext}`

  const bucket = getBucket(public)
  const params = {
    Bucket: bucket.config.name,
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

  /*
   * Here we start the multipart upload. Which has a few nuances.
   * The important point here is that we have limitation on fileSize.
   *
   * Handling it properly is a bit difficult.
   *
   * The way busboy works is that you can set a `limit` event listener.
   * When a file is too big, it will be called.
   * However, busboy WILL STILL complete it's file stream.
   * This is a very bad API design on Busboy's part. Because, this means
   * we cannot simply stream a file to S3. Because if the file is too big,
   * the stream will continue to write to S3 anyways until completion and we will save
   * the S3 file despite throwing an error.
   *
   * Therefore, logically, we cannot start the upload process before we've read all the data
   * and made sure it's not too big.
   *
   * By using stream-concat, we read all the data and load it into a buffer.
   * When reading is done, we know if the file is too big or not.
   * If it's too big, we throw an error and dismiss the buffer.
   *
   * If it's OK, then we have a buffer of data. But `upload` function only accepts
   * streams. Therefore, we use a passthrough to convert our buffer back to a stream
   * which can be consumed by upload.
   *
   * All this back and forth could've been avoided if busboy would destroy the readable
   * file stream when the file reached it's size limit.
   */

  let fileSize = null

  fixHeroku(req)

  const fields = {}

  const uploadFile = (fieldname, file, filename, encoding, mime) => {
    /*
     * If the caller sets a public parameter to true/false, use that.
     * If its not set (its undefined), consider client-defined value
     */

    if (public === undefined)
      public = Boolean(fields.public)

    const ext = filename.split('.').pop()
    const key = `${path}/${keyname}.${ext}`

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

  const readFile = (fieldname, file, filename, encoding, mime) => {
    let limitReached = false

    const writable = concat({
      encoding: 'buffer'
    }, buffer => {
      if (limitReached)
        return

      const stream = new Stream.PassThrough()
      uploadFile(fieldname, stream, filename, encoding, mime)
      stream.end(buffer)
    })

    /*
     * It seems that Heroku router has a bug: https://help.heroku.com/831736
     * If we respond to Heroku router while it's still sending us information,
     * it will throw an H18 and return 503 to clients.
     */

    file.on('end', () => {
      if (!file.truncated)
        return

      const message = `Maximum allowed file size is ${numeral(fileSize).format('0b')}.`

      limitReached = true
      cb(Error.Validation({
        message,
        slack: false
      }))
    })

    file.pipe(writable)
  }

  const busboy = new Busboy({
    headers: req.headers,
    limits: {
      fileSize: 200 * 1024 * 1024,
      files: 1
    },
    ...busboyOptions
  })

  fileSize = busboy.opts.limits.fileSize

  const setField = (name, val) => {
    fields[name] = val
  }

  busboy.on('file', readFile)
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

  const file = await upload.promise({
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

AttachedFile.downloadAsBuffer = async (file) => {
  const stream = await AttachedFile.downloadAsStream(file)
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

AttachedFile.downloadAsString = async (file) => {
  const buff = await AttachedFile.downloadAsBuffer(file)
  return buff.toString('utf-8')
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

AttachedFile.rename = async (id, name) => {
  await db.query.promise('file/rename', [
    name,
    id
  ])

  return AttachedFile.get(id)
}

AttachedFile.copyDir = async ({bucket, src, dest}) => {
  const b = getBucket(bucket)

  const params = {
    Bucket: b.config.name,
    Prefix: src
  }

  const { Contents } = await promisify(b.s3.listObjectsV2.bind(b.s3))(params)

  for (const content of Contents) {
    const Key = dest + '/' + content.Key.replace(src, '')

    await b.s3.copyObject({
      Bucket: b.config.name,
      CopySource: `/${b.config.name}/${content.Key}`,
      Key
    }).promise()
  }
}

module.exports = AttachedFile
