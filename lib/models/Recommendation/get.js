const db = require('../../utils/db.js')

/**
 * Retrieves a `Recommendation` objects
 */
const get = function (recommendation_id, cb) {
  getAll([recommendation_id], (err, recommendations) => {
    if(err)
      return cb(err)

    if (recommendations.length < 1)
      return cb(Error.ResourceNotFound(`Recommendation ${recommendation_id} not found`))

    const recommendation = recommendations[0]

    return cb(null, recommendation)
  })
}

const getAll = function(recommendation_ids, cb) {
  db.query('recommendation/get', [recommendation_ids], (err, res) => {
    if (err)
      return cb(err)

    const recommendations = res.rows

    return cb(null, recommendations)
  })
}

const getUserFavorites = function (user_id, cb) {
  db.query('recommendation/user_favorites', [user_id], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows.map(r => r.mls_number))
  })
}

const getByRoomAndListing = function (room_id, listing_id, cb) {
  db.query('room/get_recommendation', [room_id, listing_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    return cb(null, res.rows[0].id)
  })
}


module.exports = {
  get,
  getAll,
  getUserFavorites,
  getByRoomAndListing,
}
