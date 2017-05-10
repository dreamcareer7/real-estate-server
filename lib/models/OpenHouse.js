const moment = require('moment')
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')

OpenHouse = {}

Orm.register('open_house', 'OpenHouse')

const schema = {
  type: 'object',
  properties: {
    listing_mui: {
      required: true,
      type: 'number'
    },

    description: {
      required: false,
      type: 'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    start_time: {
      type: 'string',
      required: true
    },

    end_time: {
      type: 'string',
      required: true
    },

    refreshments: {
      type: 'string'
    },

    type: {
      type: 'string',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

OpenHouse.get = function (id, cb) {
  OpenHouse.getAll([id], (err, open_houses) => {
    if(err)
      return cb(err)

    if (open_houses.length < 1)
      return cb(Error.ResourceNotFound('OpenHouse ' + id + ' not found'))

    const open_house = open_houses[0]

    return cb(null, open_house)
  })
}

OpenHouse.getAll = function(oh_ids, cb) {
  db.query('open_house/get', [oh_ids], (err, res) => {
    if (err)
      return cb(err)

    const open_houses = res.rows

    return cb(null, open_houses)
  })
}

OpenHouse.create = function (openhouse, cb) {
  validate(openhouse, function (err) {
    if (err)
      return cb(err)

    const tasks = []

    const insert = cb => {
      db.query('open_house/insert', [
        openhouse.start_time,
        openhouse.end_time,
        openhouse.description,
        openhouse.listing_mui,
        openhouse.refreshments,
        openhouse.type,
        openhouse.matrix_unique_id
      ], (err, res) => {
        if (err)
          return cb(err)

        openhouse.id = res.rows[0].id
        cb()
      })
    }

    const touch = cb => {
      Listing.touchByMUI(openhouse.listing_mui, 'OpenHouseAvailable', cb)
    }

    const notification = cb => issueNotification(openhouse, cb)

    tasks.push(insert)
    tasks.push(touch)

    if (new Date(openhouse.start_time) > (new Date()))
      tasks.push(notification)

    async.series(tasks, cb)
  })
}

function issueNotification (openhouse, cb) {
  const time = moment(openhouse.start_time).format('MMM Do LT')

  async.auto({
    listing: cb => {
      Listing.getByMUI(openhouse.listing_mui, cb)
    },
    address: [
      'listing',
      (cb, results) => {
        return cb(null, Address.getLocalized(results.listing.property.address))
      }
    ],
    interested: [
      'listing',
      (cb, results) => {
        Listing.getInterestedUsers(results.listing.id, cb)
      }
    ],
    issue: [
      'listing',
      'address',
      'interested',
      (cb, results) => {
        async.map(results.interested, (r, cb) => {
          const notification = {}
          notification.subject_class = 'OpenHouse'
          notification.subject = openhouse.id
          notification.action = 'Available'
          notification.object_class = 'Listing'
          notification.object = results.listing.id
          notification.message = `Open house available for ${results.address} on ${time}`

          Notification.issueForUser(notification, r, cb)
        }, cb)
      }
    ]
  }, cb)
}

module.exports = function () {}
