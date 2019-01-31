const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const Context = require('./Context')

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

const validate = validator.promise.bind(null, schema)

Photo.create = async photo => {
  Context.log('Processing Photo', photo.matrix_unique_id, 'for listing', photo.listing_mui, 'with revision', photo.revision)

  await validate(photo)

  const res = await db.query.promise('photo/insert', [
    photo.matrix_unique_id,
    photo.listing_mui,
    photo.description,
    photo.url,
    photo.order,
    photo.exif,
    photo.revision
  ])

  return res.rows[0].id
}

Photo.deleteMissing = async (listing_mui, present_photos_muis) => {
  await db.query.promise('photo/delete_missing', [listing_mui, present_photos_muis])
}

module.exports = function () {}
