const _u = require('underscore')

const {
  recommendListings: recommendListingsToRoom
} = require('../Recommendation/create')

const {
  matchingListings
} = require('./match')

const recommendListings = function (alert_id, room_id, exclude, cb) {
  matchingListings(alert_id, (err, listings) => {
    if (err)
      return cb(err)

    listings = _u.difference(listings, exclude || [])

    recommendListingsToRoom(room_id, listings, {ref_alert_id: alert_id}, err => {
      if (err)
        return cb(err)

      return cb(null, listings)
    })
  })
}

module.exports = {
  recommendListings
}
