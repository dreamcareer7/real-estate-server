const moment = require('moment')
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const sql_insert = require('../sql/open_house/insert.sql')
const sql_get = require('../sql/open_house/get.sql')

OpenHouse = {}

Orm.register('open_house', OpenHouse)

const schema = {
  type:       'object',
  properties: {
    listing_mui: {
      required: true,
      type:     'number'
    },

    description: {
      required: false,
      type:     'string'
    },

    matrix_unique_id: {
      type:     'number',
      required: true
    },

    start_time: {
      type:     'string',
      required: true
    },

    end_time: {
      type:     'string',
      required: true
    },

    refreshments: {
      type: 'string'
    },

    type: {
      type:     'string',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

OpenHouse.get = function (id, cb) {
  db.query(sql_get, [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('OpenHouse ' + id + ' not found'))

    cb(null, res.rows[0])
  })
}

OpenHouse.create = function (openhouse, cb) {
  validate(openhouse, function (err) {
    if (err)
      return cb(err)

    const tasks = []

    const insert = cb => {
      db.query(sql_insert, [
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

    const notification = cb => issueNotification(openhouse, cb)

    tasks.push(insert)

    if (new Date(openhouse.start_time) > (new Date()))
      tasks.push(notification)

    async.series(tasks, cb)
  })
}

function issueNotification (openhouse, cb) {
  Listing.getByMUI(openhouse.listing_mui, (err, listing) => {
    if (err)
      return cb(err)

    const address = Address.getLocalized(listing.property.address)
    const time = moment(openhouse.start_time).format('MMM Do LT')

    const issue = (interested, cb) => {
      const notification = {}
      notification.action = 'Available'
      notification.object = listing.id
      notification.object_class = 'Listing'
      notification.subject = openhouse.id
      notification.subject_class = 'OpenHouse'
      notification.message = '# Open House available for ' + address + ' on ' + time
      notification.room = interested.room
      notification.recommendation = interested.recommendation

      Metric.increment('openhouse_notification')

      Notification.issueForRoom(notification, cb)
    }

    Listing.getInterestedRooms(listing.id, (err, interested) => {
      if (err)
        return cb(err)

      async.each(interested, issue, cb)
    })
  })
}

module.exports = function () {}
