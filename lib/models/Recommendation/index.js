/**
 * @namespace Recommendation
 */

const async = require('async')
const db = require('../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')
const promisify = require('util').promisify
const TABLE_NAME = 'recommendations'
const Orm = require('../Orm')
const Alert = require('../Alert/get')
const Listing = require('../Listing/get')
const User = require('../User')

const { get: getRoom } = require('../Room/get')
const { recommendListing  } = require('../Room/recommendation')

const Recommendation = {
  ...require('./create'),
  ...require('./get'),
  ...require('./patch'),
}

Orm.register('recommendation', 'Recommendation')

/**
 * * `MLS`
 * * `Zillow`
 * * `Trulia`
 * * `Realtor`
 * @typedef source
 * @type {string}
 * @memberof Recommendation
 * @instance
 * @enum {string}
 */

/**
 * * `Listing`
 * * `User`
 * * `Bank`
 * * `Card`
 * @typedef type
 * @type {string}
 * @memberof Recommendation
 * @instance
 * @enum {string}
 */

/**
 * @typedef recommendation
 * @type {object}
 * @memberof Recommendation
 * @instance
 * @property {uuid} id - ID of this `recommendation`
 * @property {Recommendation#source} source - Indicates from where this recommendation originally came to Rechat
 * @property {string} source_url - URL of the original source
 * @property {uuid} room - ID of the `room` this `recommendation` belongs to
 * @property {uuid} listing - ID of the `listing` this recommendation points to
 * @property {Recommendation#type} recommendation_type - Indicates the type for this `recommendation` eg. Listing, User, etc.
 * @property {uuid[]} referring_objects - ID of `alert` objects, causing this recommendation to surface
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

/**
 * Retrieves a set of `Recommendation` objects based on the criteria **set**
 * @name getSetForUserOnRoom
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {string} set - set of recommendations in question. This can be `feed`, `favorites`, `tours`, `actives`, `seen`
 * @param {uuid} user_id - ID of the user to fetch recommendation set for
 * @param {uuid} room_id - ID of the room to fetch recommendations from
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {User#user}
 */

const sets = new Set([
  'feed',
  'actives',
  'seen',
  'favorites',
  'tours'
])

Recommendation.getSetForUserOnRoom = function (set, user_id, room_id, paging, cb) {
  if (!sets.has(set))
    return cb(Error.Validation('Requested set (' + set + ') is not known'))

  async.auto({
    user: cb => {
      return User.get(user_id).nodeify(cb)
    },
    room: cb => {
      if (!room_id)
        return cb()

      return getRoom(room_id, cb)
    },
    set: [
      'user',
      'room',
      cb => {
        const filter = (paging.filter) ? ('{' + paging.filter + '}') : null

        return db.query('recommendation/' + set, [user_id, room_id, filter, paging.type, paging.timestamp, paging.limit], cb)
      }
    ],
    collection: [
      'user',
      'room',
      'set',
      (cb, results) => {
        const recommendation_ids = results.set.rows.map(r => r.id)

        Recommendation.getAll(recommendation_ids, (err, recommendations) => {
          if (err)
            return cb(err)

          const rows = results.set.rows
          if (rows.length > 0) {
            if (rows[0].new) recommendations[0].new = rows[0].new
            if (rows[0].total) recommendations[0].total = rows[0].total
          }

          return cb(null, recommendations)
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.collection)
  })
}

Recommendation.createForListings = async function (listings, roomId, externalInfo) {
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

/**
 * Generates necessary recommendation objects for a listing for all alerts on our system. It also
 * adds alert references to existing recommendation objects. **This is a time consuming function**
 * @name generateForListing
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation[]} An array containing all recommendation objects created
 */
Recommendation.generateForListing = function (id, cb) {
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

/**
 * Adds a reference to a recommendation object references.
 * @name addReferenceToRecommendations
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {uuid} object_id - ID of the referenced object
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Recommendation.addReferenceToRecommendations = function (room_id, listing_id, object_id, cb) {
  db.query('recommendation/add_reference_to_recs', [room_id, listing_id, object_id], cb)
}

/**
 * Unhides a recommendation object corresponding to a listing within the context of a room
 * @name unhideListingOnRoom
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Recommendation.unhide = function (recommendation_id, cb) {
  db.query('recommendation/unhide_recs', [recommendation_id], cb)
}

Recommendation.getUserFavorites = function (user_id, cb) {
  db.query('recommendation/user_favorites', [user_id], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows.map(r => r.mls_number))
  })
}

Recommendation.mapToAlerts = function (recommendations, cb) {
  db.query('recommendation/map_to_alerts', [recommendations], (err, res) => {
    if (err)
      return cb(err)

    const recommendation_ids = res.rows.map(r => {
      return r.id
    })

    return cb(null, recommendation_ids)
  })
}

Recommendation.markAsRead = function(user_id, room_id, alert_id, cb) {
  db.query('recommendation/mark_as_read', [user_id, room_id, alert_id], cb)
}

Recommendation.associations = {
  users: {
    collection: true,
    model: 'User'
  },

  listing: {
    optional: true,
    model: 'Listing'
  },

  favorited_by: {
    collection: true,
    model: 'User',
    default_value: () => []
  },

  hid_by: {
    collection: true,
    model: 'User',
    default_value: () => []
  }
}

module.exports = Recommendation
