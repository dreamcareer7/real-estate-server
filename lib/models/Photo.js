const db = require('../utils/db.js')
const { timeout } = require('../utils/timeout.js')
const validator = require('../utils/validator.js')
const Context = require('./Context')
const _ = require('lodash')

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

Photo.create = async payload => {
  // Context.log('Processing Photo', photo.matrix_unique_id, 'for listing', photo.listing_mui, 'with revision', photo.revision)

  const photos = _.chain(payload)
    .orderBy(['revision'], ['desc'])
    .uniqBy(photo => {
      return `${photo.mls}-${photo.matrix_unique_id}`
    })
    .value()

  Context.log('Processing', payload.length, 'photos, uniqued to', photos.length)

  for(const photo of photos) {
    try {
      await validate(photo)
      Context.log('Processing photo', photo.matrix_unique_id, photo.listing_mui, photo.mls)
    } catch (ex) {
      // Usually such errors occur at a high frequency one after another.
      // This will put a little bit of space between them.
      await timeout(500)
      ex.message = ex.message.replace('Validation Error', `Validation Error(${photo.mls})`)
      throw ex
    }
  }

  const res = await db.query.promise('photo/insert', [
    JSON.stringify(photos)  
  ])

  return res.rows.map(r => r.id)
}

Photo.deleteMissing = async (listing_mui, mls, present_photos_muis) => {
  await db.query.promise('photo/delete_missing', [listing_mui, mls, present_photos_muis])
}

module.exports = Photo
