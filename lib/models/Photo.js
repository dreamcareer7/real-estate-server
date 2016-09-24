const Exif = require('exif-parser')
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const sql_insert = require('../sql/photo/insert.sql')
const sql_unprocessed = require('../sql/photo/unprocessed.sql')
const sql_mark_error = require('../sql/photo/mark_as_errored.sql')
const sql_set_url = require('../sql/photo/set_url.sql')
const sql_without_exif = require('../sql/photo/get_without_exif.sql')
const sql_set_exif = require('../sql/photo/set_exif.sql')
const sql_unchecked_listings = require('../sql/photo/unchecked_listings.sql')
const sql_delete_missing = require('../sql/photo/delete_missing.sql')

Photo = {}

const schema = {
  type:       'object',
  properties: {
    listing_mui: {
      required: true,
      type:     'number'
    },

    description: {
      required: false,
      type:     'string'
    },

    url: {
      type: 'string'
    },

    matrix_unique_id: {
      type:     'number',
      required: true
    },

    order: {
      type:     'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

Photo.create = function (photo, cb) {
  validate(photo, function (err) {
    if (err)
      return cb(err)

    db.query(sql_insert, [
      photo.matrix_unique_id,
      photo.listing_mui,
      photo.description,
      photo.url,
      photo.order
    ], cb)
  })
}

Photo.getUnprocessedPhotos = function (options, cb) {
  if (!cb) {
    cb = options
    options = {}
  }

  if (!options.limit)
    options.limit = 1000

  db.query(sql_unprocessed, [
    options.limit
  ], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}

Photo.markError = function (matrix_unique_id, error, cb) {
  db.query(sql_mark_error, [
    error,
    matrix_unique_id
  ], cb)
}

Photo.setUrl = function (matrix_unique_id, url, cb) {
  db.query(sql_set_url, [
    url,
    matrix_unique_id
  ], cb)
}

Photo.getPhotosWithoutExif = function (options, cb) {
  if (!cb) {
    cb = options
    options = {}
  }

  if (!options.limit)
    options.limit = 1000

  db.query(sql_without_exif, [
    options.limit
  ], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

Photo.setExif = function (buffer, matrix_unique_id, cb) {
  let tags
  try {
    const parser = Exif.create(buffer)
    parser.enableImageSize(false)
    tags = parser.parse().tags
  } catch (err) {
    // We're unable to parse the Exif.
    // If we send error here, we'll repeatedbly try getting Exif for this
    // Which is pointless. We're always going to fail anyways.
    tags = {}
  }

  db.query(sql_set_exif, [
    tags,
    matrix_unique_id
  ], cb)
}

Photo.getUncheckedListings = function (cb) {
  db.query(sql_unchecked_listings, [], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows.map(r => r.matrix_unique_id))
  })
}

Photo.deleteMissing = function (listing_mui, present_photos_muis, cb) {
  db.query(sql_delete_missing, [listing_mui, present_photos_muis], cb)
}

module.exports = function () {}
