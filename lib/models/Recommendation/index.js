/**
 * @namespace Recommendation
 */

const async = require('async')
const db = require('../../utils/db.js')

const { get: getUser } = require('../User/get')
const { get: getRoom } = require('../Room/get')

const Recommendation = {
  ...require('./create'),
  ...require('./actions'),
  ...require('./get'),
  ...require('./patch'),
}

const sets = new Set([
  'feed',
  'actives',
  'seen',
  'favorites',
  'tours'
])

/**
 * Retrieves a set of `Recommendation` objects based on the criteria **set**
 * @name getSetForUserOnRoom
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {string} set - set of recommendations in question. This can be `feed`, `favorites`, `tours`, `actives`, `seen`
 * @param {UUID} user_id - ID of the user to fetch recommendation set for
 * @param {UUID} room_id - ID of the room to fetch recommendations from
 * @param {pagination} paging - pagination parameters
 * @returns {User#user}
 */
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

module.exports = Recommendation
