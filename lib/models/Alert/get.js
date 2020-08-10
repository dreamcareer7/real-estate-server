const _ = require('lodash')
const db = require('../../utils/db')
const ObjectUtil = require('../ObjectUtil')

const { proposeTitle } = require('./format')

const get = function (alert_id, cb) {
  getAll([alert_id], (err, alerts) => {
    if(err)
      return cb(err)

    if (alerts.length < 1)
      return cb(Error.ResourceNotFound(`Alert ${alert_id} not found`))

    const alert = alerts[0]

    cb(null, alert)
  })
}

const getAll = function(alert_ids, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('alert/get', [alert_ids, user_id], (err, res) => {
    if (err)
      return cb(err)

    const alerts = res.rows.map(r => {
      if (r.points) {
        const points = JSON.parse(r.points)
        r.points = points.coordinates[0].map( c => {
          return {
            longitude: c[0],
            latitude: c[1],
            type: 'location'
          }
        })
      }


      r.proposed_title = proposeTitle(r)

      return r
    })

    return cb(null, alerts)
  })
}

const getSet = function (set, id, paging, cb) {
  db.query(set, [
    id,
    paging.type,
    paging.timestamp,
    paging.limit
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const alert_ids = res.rows.map(r => r.id)

    getAll(alert_ids, (err, alerts) => {
      if (err)
        return cb(err)

      alerts[0].total = res.rows[0].total

      return cb(null, alerts)
    })
  })
}

const getForRoom = function (room_id, paging, cb) {
  return getSet('alert/room', room_id, paging, cb)
}

const getForUser = function (user_id, paging, cb) {
  return getSet('alert/user', user_id, paging, cb)
}

const matchingRoomsByAlerts = function (listing, cb) {
  const vals = [
    listing.price,
    listing.property.square_meters,
    listing.property.bedroom_count,
    listing.property.bathroom_count,
    listing.property.property_type,
    listing.property.property_subtype,
    listing.property.address.location ? listing.property.address.location.longitude : null,
    listing.property.address.location ? listing.property.address.location.latitude : null,
    listing.property.year_built,
    listing.property.pool_yn,
    listing.property.lot_square_meters,
    listing.status,
    listing.property.parking_spaces_covered_total,
    listing.list_office_mls_id,
    listing.list_agent_mls_id,
    listing.selling_office_mls_id,
    listing.selling_agent_mls_id,
    listing.property.architectural_style,
    listing.property.address.county_or_parish,
    listing.property.subdivision_name,
    listing.property.school_district,
    listing.property.primary_school_name,
    listing.property.middle_school_name,
    listing.property.elementary_school_name,
    listing.property.senior_high_school_name,
    listing.property.junior_high_school_name,
    listing.property.intermediate_school_name,
    listing.mls_area_major,
    listing.mls_area_minor,
    listing.property.address.postal_code,
    listing.property.pets_yn,
    listing.property.number_of_pets_allowed,
    listing.application_fee_yn,
    listing.property.appliances_yn,
    listing.property.furnished_yn,
    listing.property.fenced_yard_yn,
    listing.property.high_school_name
  ]

  db.query('listing/matching', vals, (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

const matchingUsersByAlerts = function (listing, cb) {
  const vals = [
    listing.price,
    listing.property.square_meters,
    listing.property.bedroom_count,
    listing.property.bathroom_count,
    listing.property.property_type,
    listing.property.property_subtype,
    listing.property.address.location ? listing.property.address.location.longitude : null,
    listing.property.address.location ? listing.property.address.location.latitude : null,
    listing.property.year_built,
    listing.property.pool_yn,
    listing.property.lot_square_meters,
    listing.status,
    listing.property.parking_spaces_covered_total,
    listing.list_office_mls_id,
    listing.list_agent_mls_id,
    listing.selling_office_mls_id,
    listing.selling_agent_mls_id,
    listing.property.architectural_style,
    listing.property.address.county_or_parish,
    listing.property.subdivision_name,
    listing.property.school_district,
    listing.property.primary_school_name,
    listing.property.middle_school_name,
    listing.property.elementary_school_name,
    listing.property.senior_high_school_name,
    listing.property.junior_high_school_name,
    listing.property.intermediate_school_name,
    listing.mls_area_major,
    listing.mls_area_minor,
    listing.property.address.postal_code,
    listing.property.pets_yn,
    listing.property.number_of_pets_allowed,
    listing.application_fee_yn,
    listing.property.appliances_yn,
    listing.property.furnished_yn,
    listing.property.fenced_yard_yn,
    listing.property.high_school_name,
  ]

  db.query('listing/matching_users', vals, (err, res) => {
    if (err)
      return cb(err)

    const user_ids = _.uniq(res.rows.map(r => r.id))
    const alert_ids = _.uniq(res.rows.map(r => r.alert_id))
    return cb(null, {user_ids, alert_ids})

  })
}

module.exports = {
  get,
  getAll,
  getForRoom,
  getForUser,
  matchingRoomsByAlerts,
  matchingUsersByAlerts,
}
