/**
 * @namespace Alert
 */

const db = require('../../utils/db.js')
const async = require('async')
require('./setting') // Just to inculde setting model
const ObjectUtil = require('../ObjectUtil')
const Orm = require('../Orm/registry')

const {
  getGeomTextFromLocationArray
} = require('../Address/get')

const Room = {
  ...require('../Room/get'),
  ...require('../Room/recommendation'),
}

const { issueForRoomExcept } = require('../Notification/issue')

const { get: getUser } = require('../User/get')

const { post: postMessage } = require('../Message/post')

/**
 * @typedef alert
 * @type {object}
 * @memberof Alert
 * @instance
 * @property {uuid} id - ID of this `alert`
 * @property {string} title - title of this alert
 * @property {float} minimum_price - minimum price of properties matching this alert
 * @property {float} maximum_price - maximum price of properties matching this alert
 * @property {float} minimum_square_meters - minimum square meter of the properties matching this alert
 * @property {float} maximum_square_meters - maximum square meter of the properties matching this alert
 * @property {number} minimum_bedrooms - minimum number of bedrooms a property must have to be a match against this alert
 * @property {number} minimum_bathrooms - minimum number of bathrooms a property must have to be a match against this alert
 * @property {uuid} created_by - ID of the user who created this alert
 * @property {uuid} room - ID of the room this alert belongs to
 * @property {Listing#property_types} property_types - an array of property types of properties to match against this alert
 * @property {Listing#property_subtype[]} property_subtypes - an array of property subtypes to match against this alert
 * @property {Address#point[]} points - an array of geometric points forming a polygon for search area
 * @property {number} minimum_year_built - minimum year built of the property to get matched against this alert
 * @property {number} maximum_year_built - maximum year built of the property to get matched against this alert
 * @property {float} minimum_lot_square_meters - minimum square meter of lot total for properties to get matched against this alert
 * @property {float} maximum_lot_square_meters - maximum square meter of lot total for properties to get matched against this alert
 * @property {boolean} pool - indicates whether pool is mandatory: true means mandatory, false means shouldn't have a pool, null is don't care
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

const Alert = {
  ...require('./get'),
  ...require('./create'),
  ...require('./recommendation'),
  ...require('./match'),
  ...require('./format')
}

Orm.register('alert', 'Alert', Alert)

Alert.patch = function (room_id, user_id, alert_id, alert, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb)
    },
    user: cb => {
      return getUser(user_id).nodeify(cb)
    },
    before: cb => {
      return Alert.get(alert_id, cb)
    },
    update: [
      'room',
      'user',
      'before',
      (cb, results) => {
        const next = results.before

        for (const i in alert)
          next[i] = alert[i]

        next.points = next.points ? getGeomTextFromLocationArray(next.points) : null

        db.query('alert/patch', [
          next.minimum_price,
          next.maximum_price,
          next.minimum_square_meters,
          next.maximum_square_meters,
          next.minimum_bedrooms,
          next.minimum_bathrooms,
          next.property_types,
          next.property_subtypes,
          next.title,
          next.points,
          next.minimum_year_built,
          next.maximum_year_built,
          next.pool,
          next.minimum_lot_square_meters,
          next.maximum_lot_square_meters,
          next.listing_statuses,
          next.open_house,
          next.minimum_sold_date,
          Array.isArray(alert.mls_areas) ? JSON.stringify(alert.mls_areas) : null,
          next.list_agents,
          next.list_offices,
          next.counties,
          next.minimum_parking_spaces,
          next.architectural_styles,
          next.subdivisions,
          next.school_districts,
          next.primary_schools,
          next.middle_schools,
          next.elementary_schools,
          next.senior_high_schools,
          next.junior_high_schools,
          next.intermediate_schools,
          next.sort_order,
          next.sort_office,
          next.selling_agents,
          next.selling_offices,
          next.offices,
          next.agents,
          next.high_schools,
          next.excluded_listing_ids,
          next.postal_codes,
          next.pets,
          next.number_of_pets_allowed,
          next.application_fee,
          next.appliances,
          next.furnished,
          next.fenced_yard,
          next.master_bedroom_in_first_floor || false,
          next.search,
          alert_id
        ], cb)
      }],
    alert: [
      'update',
      (cb, results) => {
        return Alert.get(alert_id, cb)
      }
    ],
    remove_from_recommendations: [
      'alert',
      (cb, results) => {
        Alert.removeFromRecommendationsReferences(alert_id, results.alert.room, cb)
      }
    ],
    hide_orphaned_recommendations: [
      'alert',
      'remove_from_recommendations',
      (cb, results) => {
        Room.hideOrphanedRecommendations(results.alert.room, cb)
      }
    ],
    recommend_listings: [
      'alert',
      (cb, results) => {
        return Alert.recommendListings(alert_id, room_id, alert.excluded_listing_ids, cb)
      }
    ],
    notification: [
      'room',
      'user',
      'recommend_listings',
      (cb, results) => {
        const notification = {}

        notification.action = 'Edited'
        notification.subject = user_id
        notification.subject_class = 'User'
        notification.object = alert_id
        notification.object_class = 'Alert'
        notification.auxiliary_object = room_id
        notification.auxiliary_object_class = 'Room'
        notification.message = '#' + results.room.proposed_title + ': @' + results.user.first_name + ' edited an Alert, check your new listings'
        notification.room = room_id

        issueForRoomExcept(notification, [user_id], cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.alert)
  })
}

Alert.delete = function (alert_id, user, cb) {
  async.auto({
    alert: cb => {
      Alert.get(alert_id, cb)
    },
    deref: [
      'alert',
      (cb, results) => {
        Alert.removeFromRecommendationsReferences(alert_id, results.alert.room, cb)
      }
    ],
    hide: [
      'alert',
      'deref',
      (cb, results) => {
        Room.hideOrphanedRecommendations(results.alert.room, cb)
      }
    ],
    delete: [
      'hide',
      (cb , results) => {
        db.query('alert/delete', [alert_id], cb)
      }
    ],
    message: [
      'alert',
      (cb, results) => {
        const message = {
          comment: `Alert "${Alert.getTitle(results.alert)}" has been deleted by ${user.abbreviated_display_name}`
        }
        return postMessage(results.alert.room, message, false, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb()
  })
}

Alert.removeFromRecommendationsReferences = function (alert_id, room_id, cb) {
  db.query('alert/remove_recs_refs', [alert_id, room_id], cb)
}

Alert.stringSearch = function (user_id, strings, cb) {
  const regexps = ObjectUtil.makeRegexps(strings)

  db.query('alert/search', [user_id, regexps], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const alert_ids = res.rows.map(r => {
      return r.id
    })

    Alert.getAll(alert_ids, (err, alerts) => {
      if (err)
        return cb(err)

      return cb(null, alerts)
    })
  })
}

Alert.getTitle = function (alert) {
  if (alert.title)
    return alert.title

  return Alert.proposeTitle(alert)
}

Alert.associations = {
  users: {
    collection: true,
    model: 'User',
  },

  created_by: {
    optional: true,
    model: 'User'
  },

  mls_areas: {
    ids: (a, cb) => {
      if (!a.mls_areas)
        return cb()

      const areas = new Set()

      a.mls_areas.forEach(pair => {
        // [number, parent]
        areas.add(`[${pair[0]},${pair[1]}]`)

        if (pair[1] > 0) { // [number, 0]
          areas.add(`[${pair[1]},0]`)
        }
      })

      return cb(null, Array.from(areas))
    },
    model: 'MLSArea',
    collection: true
  },

  user_alert_setting: {
    model: 'UserAlertSetting',
    enabled: true,
  }
}

module.exports = Alert
