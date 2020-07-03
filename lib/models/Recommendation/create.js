const async = require('async')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const squel = require('@rechat/squel').useFlavour('postgres')
const promisify = require('util').promisify
const TABLE_NAME = 'recommendations'

const Alert = require('../Alert/get')
const Listing = require('../Listing/get')
const { recommendListing  } = require('../Room/recommendation')


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

const createForListings = async function (listings, roomId, externalInfo) {
  const refId = externalInfo.ref_alert_id || externalInfo.ref_user_id
  const base = {}
  base.source = externalInfo.source || 'MLS'
  base.source_url = externalInfo.source_url || 'http://www.ntreis.net/'
  base.room = roomId
  base.referring_objects = '{' + refId + '}'
  base.recommendation_type = 'Listing'

  let time = 0
  let timeStr
  const toInsert = listings.map(l => {
    time++
    timeStr = squel.rstr(`now() + (${time} || ' ms')::interval`)
    return {
      ...base,
      listing: l.id,
      created_at: timeStr,
      updated_at: timeStr
    }
  })
  const validOnes = []
  for (const item of toInsert) {
    try {
      await promisify(validate)(item)
      validOnes.push(item)
    }
    catch (e) {
      continue
    }
  }

  const query = squel.insert()
    .into(TABLE_NAME)
    .setFieldsRows(validOnes)
    .onConflict(['room', 'listing'], {
      hidden: false,
      updated_at: squel.rstr('clock_timestamp()'),
      referring_objects: squel.case()
        .when(`${TABLE_NAME}.referring_objects @> ARRAY[?]::uuid[]`, refId)
        .then(squel.rstr(`${TABLE_NAME}.referring_objects`))
        .else(squel.rstr(`ARRAY_APPEND(${TABLE_NAME}.referring_objects, ?)`, refId))
    })
    .returning('id, (created_at = updated_at) as is_new, listing as listing_id')

  const {text, values} = query.toParam()
  const res = await promisify(db.executeSql)(text, values)
  if (res.rows) {
    return res.rows
  }
  return []
}

const generateForListing = function (id, cb) {
  Listing.get(id, (err, listing) => {
    if (err)
      return cb(err)

    if (listing.status !== 'Active')
      return cb(null, null)

    Alert.matchingRoomsByAlerts(listing, (err, sat_list) => {
      if (err)
        return cb(err)

      async.mapSeries(sat_list, function (sat, cb) {
        const external_info = {}
        external_info.ref_alert_id = sat.id
        external_info.notification = 'Hit'

        recommendListing(sat.room, listing.id, external_info, function (err, results) {
          if (err)
            return cb(err)

          return cb(null, results)
        })
      }, (err, recs) => {
        if (err)
          return cb(err)

        recs = recs.filter(Boolean)
        return cb(null, recs)
      })
    })
  })
}

module.exports = {
  create,
  createForListings,
  generateForListing
}
