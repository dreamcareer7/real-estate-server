const async = require('async')

const Brand = require('../Brand/get')
const { recommendListing } = require('../Recommendation/create')
const Listing = require('./get')

const {
  post: postMessage
} = require('../Message/post')

const {
  get: getUser
} = require('../User/get')

const {
  connectToUser
} = require('../User/actions')

const inquiry = function (user_id, listing_id, brand_id, source_type, external_info, cb) {
  async.auto({
    user: cb => {
      return getUser(user_id).nodeify(cb)
    },
    brand: cb => {
      return Brand.get(brand_id).nodeify(cb)
    },
    listing: cb => {
      return Listing.get(listing_id, cb)
    },
    in_user: [
      'brand',
      'listing',
      (cb, results) => {
        if (results.listing.proposed_agent)
          return cb(null, results.listing.proposed_agent)

        cb(Error.Validation('Cannot find an agent to make an inquiry for this listing'))
      }
    ],
    room: [
      'in_user',
      (cb, results) => {
        return connectToUser(user_id, results.in_user, source_type, brand_id, cb)
      }
    ],
    recommendation: [
      'in_user',
      'room',
      (cb, results) => {
        external_info.ref_user_id = results.in_user
        return recommendListing(results.room, listing_id, external_info, cb)
      }
    ],
    message: [
      'room',
      'recommendation',
      'in_user',
      (cb, results) => {
        const message = {
          author: results.in_user,
          recommendation: results.recommendation.id,
          comment: 'I see that you\'re interested in this house. Let me know how I can help you.'
        }

        return postMessage(results.room, message, true, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, {
      action: 'listing_inquiry',
      listing: listing_id,
      room: results.room
    })
  })
}

module.exports = {
  inquiry,
}
