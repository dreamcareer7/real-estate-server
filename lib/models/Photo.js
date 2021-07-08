const db = require('../utils/db.js')
const { timeout } = require('../utils/timeout.js')
const validator = require('../utils/validator.js')
const Context = require('./Context')

const Photo = {}

const schema = {
  type: 'object',
  properties: {
    listing_mui: {
      required: true,
      type: ['string', 'number'],
    },

    description: {
      required: false,
      type: 'string'
    },

    url: {
      type: 'string'
    },

    matrix_unique_id: {
      type: 'string',
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
  // Context.log('Processing Photo', photo.matrix_unique_id, 'for listing', photo.listing_mui, 'with revision', photo.revision)

  try {
    await validate(photo)
  } catch (ex) {
    // Usually such errors occur at a high frequency one after another.
    // This will put a little bit of space between them.
    await timeout(500)
    ex.message = ex.message.replace('Validation Error', `Validation Error(${photo.mls})`)
    throw ex
  }

  Context.set({'db:log': false})
  const res = await db.query.promise('photo/insert', [
    photo.matrix_unique_id,
    photo.listing_mui,
    photo.description,
    photo.url,
    photo.order,
    photo.exif,
    photo.revision,
    photo.mls
  ])

  return res.rows[0].id
}

Photo.deleteMissing = async (listing_mui, mls, present_photos_muis) => {
  await db.query.promise('photo/delete_missing', [listing_mui, mls, present_photos_muis])
}

module.exports = Photo
