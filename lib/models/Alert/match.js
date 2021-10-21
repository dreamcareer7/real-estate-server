const db = require('../../utils/db.js')
const async = require('async')
const _u = require('underscore')
const Context = require('../Context')

const {
  get
} = require('./get')

const {
  validate,
  validatePointsArray
} = require('./validate')

const { getCompacts } = require('../Listing/get')

const matchingListings = function (alert_id, cb) {
  get(alert_id, (err, alert) => {
    if (err)
      return cb(err)

    return matchingListingsForAlertData(alert, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, results.listings)
    })
  })
}

const matchingListingsForAlertData = function (alert, cb) {
  const query = buildQuery(alert)  
  db.query(query, [], (err, res) => {
    if (err)
      return cb(err)

    Context.log('Matching Query Completed')

    const listings = res.rows.map(r => r.id)

    return cb(null, {
      listings: listings,
      total: (res.rows[0] ? res.rows[0].total : 0)
    })
  })
}

const buildQuery = require('../../sql/alert/matching.js')

const check = function (alert_ref, cb) {
  const alert = _u.clone(alert_ref)

  alert.title = 'Dummy'
  if (alert.limit !== false)
    alert.limit = alert.limit || 50


  async.auto({
    validate: cb => {
      validate(alert, err => {
        if (err)
          return cb(err)

        if (!alert.points)
          return cb()

        return validatePointsArray(alert, cb)
      })
    },
    matching: [
      'validate',
      (cb, results) => {
        matchingListingsForAlertData(alert, cb)
      }
    ],
    compact_listings: [
      'matching',
      (cb, results) => {
        let matching = results.matching.listings
        matching = _u.difference(matching, alert.excluded_listing_ids || [])
        const total = results.matching.total - (alert.excluded_listing_ids ? alert.excluded_listing_ids.length : 0)
        let listing_ids = matching.slice(0, alert.limit)
        
        if (alert.limit === false)
          listing_ids = matching

        getCompacts(listing_ids).nodeify((err, listings) => {
          if (err)
            return cb(err)

          if (listings[0])
            listings[0].total = total

          return cb(null, listings)
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.compact_listings)
  })
}

module.exports = {
  check,
  buildQuery,
  matchingListings,
  matchingListingsForAlertData
}
