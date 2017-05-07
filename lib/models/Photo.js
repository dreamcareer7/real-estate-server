const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

Photo = {}

const schema = {
  type: 'object',
  properties: {
    listing_mui: {
      required: true,
      type: 'number'
    },

    description: {
      required: false,
      type: 'string'
    },

    url: {
      type: 'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    order: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

Photo.create = function (photo, cb) {
  validate(photo, function (err) {
    if (err)
      return cb(err)

    db.query('photo/insert', [
      photo.matrix_unique_id,
      photo.listing_mui,
      photo.description,
      photo.url,
      photo.order,
      photo.exif
    ], cb)
  })
}

Photo.deleteMissing = function (listing_mui, present_photos_muis, cb) {
  db.query('photo/delete_missing', [listing_mui, present_photos_muis], cb)
}

module.exports = function () {}
