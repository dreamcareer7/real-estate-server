const db = require('../../utils/db.js')
const async = require('async')
const _u = require('underscore')
const Context = require('../Context')
const squel = require('@rechat/squel').useFlavour('postgres')
const buildQuery = require('../../sql/alert/matching.js')

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
  const query = buildQuery.list(alert)

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

const count = function (alert_ref, cb) {
  const alert = _u.clone(alert_ref)

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
    count: [
      'validate',
      (cb, results) => {
        const query = buildQuery.count(alert)

        db.query(query, [], (err, res) => {
          if (err)
            return cb(err)

          Context.log('Matching Query Completed')

          cb(null, parseInt(res.rows[0]?.total || 0))
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.count)
  })
}



const agents = async (alert) => {
  const filters = buildQuery.list(alert)

  const listings = squel.select().from('listings')
    .fields('id,price,co_list_agent_mui,list_agent_mui,selling_agent_mui,co_selling_agent_mui,mls'.split(','))
    .where('id in (SELECT id FROM filters)')

  const list_agents = squel.select().from('agents')
    .fields('agents.id as list_agent,count(listings.id),sum(price) as sum_price'.split(','))
    .join('listings', undefined,
      'agents.mls=listings.mls and agents.matrix_unique_id IN (listings.list_agent_mui, listings.co_list_agent_mui) and agents.email is not null')
    .group('agents.id')

  const selling_agents = squel.select().from('agents')
    .fields('agents.id as selling_agent,count(listings.id) as selling_count,sum(price) as selling_sum_price'.split(','))
    .join('listings', undefined,
      'agents.mls=listings.mls and agents.matrix_unique_id IN (listings.selling_agent_mui, listings.co_selling_agent_mui) and agents.email is not null')
    .group('agents.id')

  const q = squel.select()
    .with('filters', filters)
    .with('listings', listings)
    .with('list_agents', list_agents)
    .with('selling_agents', selling_agents)
    .from('selling_agents')
    .full_join('list_agents', undefined, 'selling_agents.selling_agent=list_agents.list_agent')

  Context.log(q.toString())
  return db.query.promise(q)
}

module.exports = {
  check,
  count,
  agents,
  buildQuery,
  matchingListings,
  matchingListingsForAlertData
}
