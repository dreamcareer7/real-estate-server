const db = require('../../utils/db.js')

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
const addReferenceToRecommendations = function (room_id, listing_id, object_id, cb) {
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
const unhide = function (recommendation_id, cb) {
  db.query('recommendation/unhide_recs', [recommendation_id], cb)
}

const mapToAlerts = function (recommendations, cb) {
  db.query('recommendation/map_to_alerts', [recommendations], (err, res) => {
    if (err)
      return cb(err)

    const recommendation_ids = res.rows.map(r => {
      return r.id
    })

    return cb(null, recommendation_ids)
  })
}

const markAsRead = function(user_id, room_id, alert_id, cb) {
  db.query('recommendation/mark_as_read', [user_id, room_id, alert_id], cb)
}

module.exports = {
  unhide,
  markAsRead,
  mapToAlerts,
  addReferenceToRecommendations,
}
