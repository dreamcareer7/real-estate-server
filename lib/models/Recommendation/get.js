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

module.exports = {
  get,
  getAll,
}
