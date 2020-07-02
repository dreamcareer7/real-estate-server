const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

const Listing = require('../Listing/get')
const {
  get: getRoom
} = require('./get')

const schema = {
  type: 'object',
  properties: {
    recommendation_type: {
      type: 'string',
      required: true,
      enum: [ 'Listing', 'User', 'Bank', 'Card' ]
    },

    source: {
      type: 'string',
      required: true,
      enum: [ 'MLS', 'Zillow', 'Trulia', 'Realtor' ]
    },

    source_url: {
      type: 'string',
      required: false
    },

    room: {
      type: 'string',
      uuid: true,
      required: true
    },

    listing: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

function insert (recommendation, cb) {
  db.query('recommendation/insert', [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_objects,
    recommendation.room,
    recommendation.listing
  ], (err, res) => {
    if (err)
      return cb(err)

    if(res.rows && res.rows[0])
      return cb(null, res.rows[0].id)

    return cb()
  })
}

/**
 * Creates a `recommendation` object
 */
const create = function (recommendation, cb) {
  validate(recommendation, function (err) {
    if (err)
      return cb(err)

    getRoom(recommendation.room, function (err, room) {
      if (err)
        return cb(err)
      Listing.get(recommendation.listing, function (err, room) {
        if (err)
          return cb(err)

        return insert(recommendation, cb)
      })
    })
  })
}

module.exports = {
  create,
}
