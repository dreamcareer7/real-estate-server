const async = require('async')

const db = require('../../utils/db.js')
const Activity = require('../Activity')

const {
  getGeomTextFromLocationArray
} = require('../Address/get')

const Room = {
  ...require('../Room/get'),
  ...require('../Room/recommendation')
}

const {
  recommendListings
} = require('./recommendation')

const {
  validate,
  validatePointsArray
} = require('./validate')

const { issueForRoomExcept } = require('../Notification/issue')

const { get: getUser } = require('../User/get')

const { get } = require('./get')

const create = function (room_id, alert, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb)
    },
    owner: cb => {
      return getUser(alert.created_by).nodeify(cb)
    },
    validate: cb => {
      validate(alert, err => {
        if (err)
          return cb(err)

        if (!alert.points)
          return cb()

        return validatePointsArray(alert, cb)
      })
    },
    insert: [
      'room',
      'owner',
      'validate',
      (cb, results) => {
        const points = alert.points ? getGeomTextFromLocationArray(alert.points) : null

        db.query('alert/insert', [
          alert.minimum_price,
          alert.maximum_price,
          alert.minimum_square_meters,
          alert.maximum_square_meters,
          alert.minimum_bedrooms,
          alert.minimum_bathrooms,
          alert.created_by,
          room_id,
          alert.property_types,
          alert.property_subtypes,
          alert.title,
          points,
          alert.minimum_year_built,
          alert.maximum_year_built,
          alert.pool,
          alert.minimum_lot_square_meters,
          alert.maximum_lot_square_meters,
          alert.listing_statuses,
          alert.open_house,
          alert.minimum_sold_date,
          Array.isArray(alert.mls_areas) ? JSON.stringify(alert.mls_areas) : null,
          alert.list_agents,
          alert.list_offices,
          alert.counties,
          alert.minimum_parking_spaces,
          alert.architectural_styles,
          alert.subdivisions,
          alert.school_districts,
          alert.primary_schools,
          alert.middle_schools,
          alert.elementary_schools,
          alert.senior_high_schools,
          alert.junior_high_schools,
          alert.intermediate_schools,
          alert.sort_order,
          alert.sort_office,
          alert.selling_agents,
          alert.selling_offices,
          alert.offices,
          alert.agents,
          alert.high_schools,
          alert.excluded_listing_ids,
          alert.postal_codes,
          alert.pets,
          alert.number_of_pets_allowed,
          alert.application_fee,
          alert.appliances,
          alert.furnished,
          alert.fenced_yard,
          alert.master_bedroom_in_first_floor || false,
          alert.search,
          alert.maximum_bedrooms,
          alert.maximum_bathrooms
        ],
          (err, res) => {
            if (err)
              return cb(err)

            return cb(null, res.rows[0].id)
          })
      }
    ],
    alert: [
      'insert',
      (cb, results) => {
        return get(results.insert, cb)
      }
    ],
    recommend_listings: [
      'alert',
      (cb, results) => {
        return recommendListings(results.insert, room_id, alert.excluded_listing_ids, cb)
      }
    ],
    notification: [
      'owner',
      'recommend_listings',
      (cb, results) => {
        const notification = {}

        notification.action = 'Created'
        notification.subject = results.owner.id
        notification.subject_class = 'User'
        notification.object = results.insert
        notification.object_class = 'Alert'
        notification.auxiliary_object = room_id
        notification.auxiliary_object_class = 'Room'
        notification.message = '#' + results.room.proposed_title + ': @' + results.owner.first_name + ' added a new Alert, check your new listings'
        notification.room = room_id

        notification.alert_results = {
          listing: (results.recommend_listings && results.recommend_listings.length > 0) ? results.recommend_listings[0] : null,
          count: (results.recommend_listings) ? results.recommend_listings.length : 0
        }

        issueForRoomExcept(notification, [results.owner.id], cb)
      }
    ],
    activity: [
      'owner',
      'insert',
      (cb, results) => {
        const activity = {
          action: 'UserCreatedAlert',
          object: results.insert,
          object_class: 'alert'
        }
        const intercomActivity = {
          action: results.room.room_type === 'Personal' ? 'UserSavedAlert' : 'UserSharedAlert',
          object: results.insert,
          object_class: 'alert'
        }

        Activity.add(alert.created_by, 'User', activity, (err) => {
          if (err)
            return cb(err)

          Activity.add(alert.created_by, 'User', intercomActivity, cb)
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.alert)
  })
}

module.exports = { create }
