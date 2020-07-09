const async = require('async')

const db = require('../../utils/db.js')

const Activity = require('../Activity')
const Listing = require('../Listing/get')
const User = require('../User/get')
const { get: getRecommendation } = require('./get')

const actions = new Set([
  'add_read',
  'remove_read',
  'add_favorite',
  'remove_favorite',
  'add_tour',
  'remove_tour',
  'add_hid',
  'remove_hid'
])

const patch = function (property, action, user_id, recommendation_id, notify, cb) {
  async.auto({
    user: cb => {
      return User.get(user_id).nodeify(cb)
    },
    recommendation: cb => {
      getRecommendation(recommendation_id, cb)
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
      cb => getRecommendation(recommendation_id, cb)
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.updated)
  })
}

module.exports = {
  patch,
}
