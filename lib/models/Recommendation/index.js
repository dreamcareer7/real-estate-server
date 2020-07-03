/**
 * @namespace Recommendation
 */

const async = require('async')
const db = require('../../utils/db.js')
const Orm = require('../Orm')

const { get: getUser } = require('../User/get')
const { get: getRoom } = require('../Room/get')

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
      return getUser(user_id).nodeify(cb)
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
