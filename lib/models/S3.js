/**
 * @namespace S3
 */

const config = require('../config.js')
const AWS = require('aws-sdk')
const uuid = require('node-uuid')
const multiparty = require('multiparty')
const fs = require('fs')
const path = require('path')
const Exif = require('exif-parser')
const async = require('async')
const fileType = require('file-type')

let s3
if (process.env.NODE_ENV) {
  const S3Mock = require('mock-aws-s3')
  s3 = S3Mock.S3()
} else {
  s3 = new AWS.S3()
}

S3 = {}


/**
 * @typedef file
 * @type {object}
 * @memberof S3
 * @instance
 * @property {string=} name - file name
 * @property {string} ext - file extension
 * @property {buffer} body - file content
 */


/**
 * Uploads a file on S3 service. If a file name is not specified, a UUID version 1
 * is automatically generated to be used as file name. A file extension has to be
 * present in order for this method to work properly.
 * @name upload
 * @function
 * @memberof S3
 * @instance
 * @public
 * @param {string} bucket - name of the S3 bucket to upload this file to
 * @param {S3#file} file - full file object
 * @param {callback} cb - callback function
 * @returns {URL} full URL of the object
 */
S3.upload = function(bucket, file, cb) {
  const bucket_name = config.buckets[bucket]
  const cdn = config.cdns[bucket]
  const mime_ext = file.info['mime-extension']

  if(!bucket_name || !cdn) {
    return cb(Error.Generic('Could not find bucket or cdn information'))
  }

  const key = (file.attachment) ? (uuid.v1() + (file.ext || mime_ext ? ('.' + mime_ext) : '')) :
      (file.name + file.ext)

  const params = {
    Bucket: bucket_name,
    Key: key,
    ContentType: file.info.mime || 'application/octet-stream',
    Body: file.body
  }

  file.url = cdn + key

  async.auto({
    url: (cb) => {
      s3.putObject(params, function(err, data) {
        if (err) {
          console.log('<- (S3-Transport) Error uploading file'.red, key.yellow, ':', JSON.stringify(err))
          return cb(Error.Amazon())
        }

        return cb(null, file.url)
      })
    },
    attachment: [
      'url',
      (cb) => {
        if(!file.attachment)
          return cb()

        return Attachment.create(file, cb)
      }
    ],
    get: [
      'attachment',
      (cb, results) => {
        if(!file.attachment)
          return cb()

        return Attachment.get(results.attachment.id, cb)
      }
    ]
  }, cb)
}

/**
 * Parses a multipart request and receives the incoming object. This object
 * must be present in request and labeled as `media` or `image` in order for
 * this method to work properly. The incoming file is then stored in a temporary
 * location, usually /tmp as specified by host operating system specification.
 * After the incoming file is received, we remove it from the file system.
 * @name parseSingleFormData
 * @function
 * @memberof S3
 * @instance
 * @public
 * @param {req} req - HTTP request object
 * @param {callback} cb - callback function
 * @returns {S3#file} full file object
 */
S3.parseSingleFormData = function(req, cb) {
  const form = new multiparty.Form({autoFiles: false})

  form.parse(req, function(err, fields, files) {
    if(err) {
      if(err.statusCode) {
        return cb(Error.BadRequest())
      }

      return cb(Error.Generic())
    }

    if(!files.media && !files.image)
      return cb(Error.Validation('Upload must contain either media or image keys'))

    const target = (files.media) ? files.media[0] : files.image[0]
    const fpath = target.path
    const ext = path.extname(target.originalFilename) || undefined
    const size = target.size
    const name = target.originalFilename ? path.basename(target.originalFilename, ext) : undefined

    fs.readFile(fpath, function(err, body) {
      if(err)
        return cb(Error.FileSystem())

      const mime_info = fileType(body)
      let metadata = {}
      try {
        const parser = Exif.create(body)
        parser.enableImageSize(true)
        metadata = parser.parse()
      } catch(err) {
        // FIXME: What about here?
      }

      fs.unlink(fpath, function(err, ok) {
        if(err)
          return cb(Error.FileSystem())

        let info = {}
        let attributes = {}
        try {
          info = JSON.parse(fields.info[0])
        } catch (e) {
          info = {}
        }

        try {
          attributes = JSON.parse(fields.attributes[0])
        } catch (e) {
          attributes = {}
        }

        info['name'] = name
        info['extension'] = ext
        info['mime-extension'] = mime_info ? mime_info.ext : undefined
        info['size'] = size
        info['mime'] = mime_info ? mime_info.mime : 'application/octet-stream'

        return cb(null, {
          user: req.user.id,
          body: body,
          ext: ext,
          name: name,
          metadata: metadata,
          attachment: true,
          info: info,
          attributes: attributes
        })
      })
    })
  })
}

S3.uploadAttachment = function(req, model, id, cb) {
  async.auto({
    media: cb => {
      return S3.parseSingleFormData(req, cb)
    },
    user: cb => {
      return User.get(process.domain.user.id, cb)
    },
    upload: [
      'user',
      'media',
      (cb, results) => {
        return S3.upload('attachments', results.media, cb)
      }
    ],
    link: [
      'upload',
      (cb, results) => {
        return Attachment.link(id, results.upload.attachment.id, cb)
      }
    ],
    assignees: [
      'user',
      'media',
      'upload',
      'link',
      (cb, results) => {
        return ObjectUtil.getAssignees(model, id, cb)
      }
    ],
    dereference: [
      'media',
      'upload',
      'link',
      (cb, results) => {
        return ObjectUtil.dereference(model, id, cb)
      }
    ],
    notification: [
      'media',
      'user',
      'upload',
      'link',
      'assignees',
      'dereference',
      (cb, results) => {
        const notification = {}

        notification.action = 'Created'
        notification.subject = process.domain.user.id
        notification.subject_class = 'User'
        notification.object = results.upload.attachment.id
        notification.object_class = 'Attachment'
        notification.auxiliary_object = id
        notification.auxiliary_object_class = model
        notification.message = results.user.first_name + ' created an attachment on ' + model + ': ' + results.dereference.title

        Notification.issueForUsersExcept(notification, results.assignees, results.user.id, {}, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.dereference)
  })
}

module.exports = function(){}
