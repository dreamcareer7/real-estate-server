
const db = require('../../utils/db.js')

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name hideOrphanedRecommendations
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {UUID} room_id - ID of the referenced room
 * @param {() => {}} cb - callback function
 */
const hideOrphanedRecommendations = function (room_id, cb) {
  db.query('room/hide_orphaned_recs', [room_id], cb)
}

module.exports = {
  hideOrphanedRecommendations,
}
