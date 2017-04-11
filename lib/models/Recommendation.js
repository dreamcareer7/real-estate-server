/**
 * @namespace Recommendation
 */

const async = require('async')
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

Recommendation = {}

Orm.register('recommendation', Recommendation)

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
 * @property {number} matrix_unique_id - Unique ID of this listing on the MLS system, also known as MUI.
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

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
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

/**
 * Inserts a `recommendation` object into database
 * @memberof Recommendation
 * @instance
 * @public
 * @param {Recommendation#recommendation} recommendation - full recommendation object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `recommendation` object created
 */
function insert (recommendation, cb) {
  db.query('recommendation/insert', [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_objects,
    recommendation.room,
    recommendation.listing,
    recommendation.matrix_unique_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if(res.rows && res.rows[0])
      return cb(null, res.rows[0].id)

    return cb()
  })
}

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
      return User.get(user_id, cb)
    },
    room: cb => {
      if (!room_id)
        return cb()

      return Room.get(room_id, cb)
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

        async.map(recommendation_ids, Recommendation.get, (err, recommendations) => {
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

Recommendation.getCounts = function (recommendation_id, cb) {
  const counts = {
    comment_count: 0,
    document_count: 0,
    image_count: 0,
    video_count: 0
  }

  db.query('recommendation/counts', [recommendation_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, counts)

    counts.comment_count = res.rows[0].comment_count
    counts.document_count = res.rows[0].document_count
    counts.image_count = res.rows[0].image_count
    counts.video_count = res.rows[0].video_count

    return cb(null, counts)
  })
}

const actions = new Set([
  'add_read',
  'remove_read',
  'add_favorite',
  'remove_favorite',
  'add_tour',
  'remove_tour'
])

Recommendation.patch = function (property, action, user_id, recommendation_id, notify, cb) {
  async.auto({
    user: cb => {
      return User.get(user_id, cb)
    },
    recommendation: cb => {
      Recommendation.get(recommendation_id, cb)
    },
    listing: [
      'recommendation',
      (cb, results) => {
        return Listing.get(results.recommendation.listing, cb)
      }
    ],
    patch: [
      'recommendation',
      (cb, results) => {
        const _action = (action) ? 'add_' : 'remove_'
        const query = _action + property

        if (!actions.has(query))
          return cb(Error.Validation('Requested action or property is not known'))

        db.query('recommendation/' + query, [user_id, recommendation_id], cb)
      }
    ],
    activity: [
      'user',
      'recommendation',
      (cb, results) => {
        if(!(property === 'favorite' && action))
          return cb()

        const activity = {
          action: 'UserFavoritedListing',
          object: recommendation_id,
          object_class: 'recommendation'
        }

        Activity.add(user_id, 'User', activity, cb)
      }
    ],
    updated: [
      'patch',
      cb => Recommendation.get(recommendation_id, cb)
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.updated)
  })
}

/**
 * Retrieves a `Recommendation` objects
 * @name get
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} recommendation_id - ID of the referenced recommendation
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation}
 */
Recommendation.get = function (recommendation_id, cb) {
  db.query('recommendation/get', [recommendation_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Recommendation ' + recommendation_id + ' not found'))

    const recommendation = res.rows[0]

    Recommendation.getCounts(recommendation_id, (err, counts) => {
      if (err)
        return cb(err)

      recommendation.comment_count = counts.comment_count
      recommendation.document_count = counts.document_count
      recommendation.video_count = counts.video_count
      recommendation.image_count = counts.image_count

      return cb(null, recommendation)
    })
  })
}

/**
 * Creates a `recommendation` object
 * @name create
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {Recommendation#recommendation} recommendation - full recommendation object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `recommendation` object created
 */
Recommendation.create = function (recommendation, cb) {
  validate(recommendation, function (err) {
    if (err)
      return cb(err)

    Room.get(recommendation.room, function (err, room) {
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
  Listing.get(id, function (err, listing) {
    if (err)
      return cb(err)

    if (!listing.property.address.location)
      return cb(null, null)

    if (listing.status !== 'Active')
      return cb(null, null)

    Listing.matchingRoomsByAlerts(id, function (err, sat_list) {
      if (err)
        return cb(err)

      async.mapSeries(sat_list, function (sat, cb) {
        const external_info = {}
        external_info.ref_alert_id = sat.id
        external_info.notification = 'Hit'

        Room.recommendListing(sat.room, listing.id, external_info, function (err, results) {
          if (err)
            return cb(null, null)

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
    ids: (r, cb) => Room.getUsersIDs(r.room, cb),
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
  }
}

module.exports = function () {}
