const _ = require('lodash')
const async = require('async')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const squel = require('@rechat/squel').useFlavour('postgres')
const promisify = require('util').promisify
const TABLE_NAME = 'recommendations'

const Alert = require('../Alert/get')
const Activity = require('../Activity')
const Address = require('../Address/get')
const Listing = require('../Listing/get')
const Notification = require('../Notification/issue')

const {
  get: getUser
} = require('../User/get')

const {
  get: getListing,
  getAll: getListings
} = require('../Listing/get')

const {
  get,
  getByRoomAndListing,
} = require('./get')

const {
  unhide,
  addReferenceToRecommendations,
} = require('./actions')

const {
  get: getRoom
} = require('../Room/get')

const schema = {
  type: 'object',
  properties: {
    recommendation_type: {
      type: 'string',
      required: true,
      enum: [ 'Listing', 'User', 'Bank', 'Card' ]
    },

    source: {
      type: 'string',
      required: true,
      enum: [ 'MLS', 'Zillow', 'Trulia', 'Realtor' ]
    },

    source_url: {
      type: 'string',
      required: false
    },

    room: {
      type: 'string',
      uuid: true,
      required: true
    },

    listing: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

function insert (recommendation, cb) {
  db.query('recommendation/insert', [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_objects,
    recommendation.room,
    recommendation.listing
  ], (err, res) => {
    if (err)
      return cb(err)

    if(res.rows && res.rows[0])
      return cb(null, res.rows[0].id)

    return cb()
  })
}

function listing_notification (listing, room, user, recommendation_id, external_info, cb) {
  const address_line = Address.getLocalized(listing.property.address)
  const notification = {}

  if (external_info.notification === 'Hit') {
    return cb()
    // notification.subject = listing.id
    // notification.subject_class = 'Listing'
    // notification.object = room.id
    // notification.object_class = 'Room'
    // notification.auxiliary_subject = (external_info.ref_alert_id) ?
    //   external_info.ref_alert_id : external_info.ref_user_id
    // notification.auxiliary_subject_class = (external_info.ref_alert_id) ?
    //   'Alert' : 'User'
    // notification.recommendation = recommendation_id
    // notification.room = room.id
    // notification.action = 'BecameAvailable'
    // notification.message = '#' + room.proposed_title + ': ' + address_line + ' just hit the market'
    //
    // console.log('↯'.cyan, 'Recommending Listing with MUI:',
    //             ('#' + listing.matrix_unique_id).red,
    //             '('.cyan, listing.id.yellow, ')'.cyan,
    //             '*'.blue, address_line, '*'.blue,
    //             'MLS#:'.white, listing.mls_number.yellow,
    //             'to Room #', room.proposed_title.magenta,
    //             'with ID:'.cyan, room.id.yellow,
    //             'invoked by', notification.auxiliary_subject_class,
    //             'with ID:'.cyan, notification.auxiliary_subject.red
    //            )
    // return Notification.issueForRoom(notification, cb)
  } else if (external_info.notification === 'Share') {
    notification.subject = user.id
    notification.subject_class = 'User'
    notification.object = listing.id
    notification.object_class = 'Listing'
    notification.recommendation = recommendation_id
    notification.room = room.id
    notification.action = 'Shared'
    notification.message = '#' + room.proposed_title + ': ' + '@' + user.first_name + ' shared ' + address_line

    console.log('↵'.cyan, 'User', user.first_name.magenta, user.last_name.magenta, 'with ID:', user.id.yellow,
      'Shared a Listing with MUI:',
      ('#' + listing.matrix_unique_id).red,
      '('.cyan, listing.id.yellow, ')'.cyan,
      '*'.blue, address_line, '*'.blue,
      'MLS#:'.white, listing.mls_number.yellow,
      'with Room #', room.proposed_title.magenta,
      'ID:', room.id.yellow.cyan)

    return Notification.issueForRoomExcept(notification, [user.id], cb)
  }

  return cb()
}

/**
 * Creates a `recommendation` object
 */
const create = function (recommendation, cb) {
  validate(recommendation, function (err) {
    if (err)
      return cb(err)

    getRoom(recommendation.room, function (err, room) {
      if (err)
        return cb(err)
      Listing.get(recommendation.listing, function (err, room) {
        if (err)
          return cb(err)

        return insert(recommendation, cb)
      })
    })
  })
}

const createForListings = async function (listings, roomId, externalInfo) {
  const refId = externalInfo.ref_alert_id || externalInfo.ref_user_id
  const base = {}
  base.source = externalInfo.source || 'MLS'
  base.source_url = externalInfo.source_url || 'http://www.ntreis.net/'
  base.room = roomId
  base.referring_objects = '{' + refId + '}'
  base.recommendation_type = 'Listing'

  let time = 0
  let timeStr
  const toInsert = listings.map(l => {
    time++
    timeStr = squel.rstr(`now() + (${time} || ' ms')::interval`)
    return {
      ...base,
      listing: l.id,
      created_at: timeStr,
      updated_at: timeStr
    }
  })
  const validOnes = []
  for (const item of toInsert) {
    try {
      await promisify(validate)(item)
      validOnes.push(item)
    }
    catch (e) {
      continue
    }
  }

  const query = squel.insert()
    .into(TABLE_NAME)
    .setFieldsRows(validOnes)
    .onConflict(['room', 'listing'], {
      hidden: false,
      updated_at: squel.rstr('clock_timestamp()'),
      referring_objects: squel.case()
        .when(`${TABLE_NAME}.referring_objects @> ARRAY[?]::uuid[]`, refId)
        .then(squel.rstr(`${TABLE_NAME}.referring_objects`))
        .else(squel.rstr(`ARRAY_APPEND(${TABLE_NAME}.referring_objects, ?)`, refId))
    })
    .returning('id, (created_at = updated_at) as is_new, listing as listing_id')

  const {text, values} = query.toParam()
  const res = await promisify(db.executeSql)(text, values)
  if (res.rows) {
    return res.rows
  }
  return []
}

const generateForListing = function (id, cb) {
  Listing.get(id, (err, listing) => {
    if (err)
      return cb(err)

    if (listing.status !== 'Active')
      return cb(null, null)

    Alert.matchingRoomsByAlerts(listing, (err, sat_list) => {
      if (err)
        return cb(err)

      async.mapSeries(sat_list, function (sat, cb) {
        const external_info = {}
        external_info.ref_alert_id = sat.id
        external_info.notification = 'Hit'

        recommendListing(sat.room, listing.id, external_info, function (err, results) {
          if (err)
            return cb(err)

          return cb(null, results)
        })
      }, (err, recs) => {
        if (err)
          return cb(err)

        recs = recs.filter(Boolean)
        return cb(null, recs)
      })
    })
  })
}


/**
 * Recommends a `Listing` to the specified `room`. We expect `ref_object_id` be present
 * in the external_info object as a mandatory field. This method automatically adds invoking
 * alert to the list of referring_objects.
 * @name recommendListing
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {UUID} room_id - ID of the referenced room
 * @param {UUID} listing_id - ID of the referenced listing
 * @param {*} external_info - external information on a listing object
 */
const recommendListing = function (room_id, listing_id, external_info, cb) {
  if (!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'))

  if (external_info.ref_user_id && (external_info.notification !== 'Share' &&
                                    external_info.notification !== 'None' &&
                                    !_.isUndefined(external_info.notification)))
    return cb(Error.Validation('Reference is a user, but notification type indicates otherwise'))

  if (external_info.ref_alert_id && (external_info.notification !== 'Hit' &&
                                     external_info.notification !== 'None' &&
                                     !_.isUndefined(external_info.notification)))
    return cb(Error.Validation('Reference is an alert, but notification type indicates otherwise'))

  const ref_id = external_info.ref_alert_id || external_info.ref_user_id

  async.auto({
    room: cb => {
      getRoom(room_id, cb)
    },
    listing: cb => {
      getListing(listing_id, cb)
    },
    recommendation: [
      'room',
      'listing',
      (cb, results) => {
        const recommendation = {}

        recommendation.source = external_info.source || 'MLS'
        recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/'
        recommendation.room = room_id
        recommendation.referring_objects = '{' + ref_id + '}'
        recommendation.listing = listing_id
        recommendation.recommendation_type = 'Listing'

        return cb(null, recommendation)
      }
    ],
    insert: [
      'room',
      'listing',
      'recommendation',
      (cb, results) => {
        return create(results.recommendation, cb)
      }
    ],
    dup: [
      'room',
      'listing',
      'insert',
      (cb, results) => {
        if (results.insert)
          return cb()

        const opts = results

        async.auto({
          add_reference_to_recommendation: cb => {
            addReferenceToRecommendations(room_id, listing_id, ref_id, cb)
          },
          map: cb => {
            getByRoomAndListing(room_id, listing_id, cb)
          },
          user: cb => {
            if (!external_info.ref_user_id)
              return cb()

            return getUser(external_info.ref_user_id).nodeify(cb)
          },
          unhide_recommendation: [
            'add_reference_to_recommendation',
            'map',
            (cb, results) => {
              unhide(results.map, cb)
            }
          ],
          notifications: [
            'add_reference_to_recommendation',
            'user',
            'unhide_recommendation',
            (cb, results) => {
              if (external_info.notification === 'Share')
                listing_notification(opts.listing, opts.room, results.user, results.map, external_info, cb)
              else
                return cb()
            }
          ]
        }, (err, results) => {
          if (err)
            return cb(err)

          return cb(null, results.map)
        })
      }
    ],
    not_dup: [
      'room',
      'listing',
      'insert',
      (cb, results) => {
        if (!results.insert)
          return cb()

        const opts = results

        async.auto({
          user: cb => {
            if (!external_info.ref_user_id)
              return cb()

            return getUser(external_info.ref_user_id).nodeify(cb)
          },
          notifications: [
            'user',
            (cb, results) => {
              listing_notification(opts.listing, opts.room, results.user, opts.insert, external_info, cb)
            }
          ]
        }, (err, results) => {
          if (err)
            return cb(err)

          return cb(null, opts.insert)
        })
      }
    ],
    activity: [
      'room',
      'listing',
      'insert',
      'dup',
      'not_dup',
      (cb, results) => {
        if (!external_info || !external_info.ref_user_id || !(external_info.notification === 'Share'))
          return cb()

        const activity = {
          action: 'UserSharedListing',
          object: listing_id,
          object_class: 'listing'
        }

        Activity.add(external_info.ref_user_id, 'User', activity, cb)
      }
    ],
    get: [
      'dup',
      'not_dup',
      (cb, results) => {
        const r = results.not_dup || results.dup

        get(r, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.get)
  })
}

const recommendListings = async function (room_id, listing_ids, external_info, cb) {
  if (listing_ids.length === 0) {
    cb(null, [])
    return []
  }
  if (!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'))
  
  if (external_info.ref_user_id && (external_info.notification !== 'Share' &&
    external_info.notification !== 'None' &&
    !_.isUndefined(external_info.notification)))
    return cb(Error.Validation('User is a reference, but notification type indicates otherwise'))
  
  if (external_info.ref_alert_id && (external_info.notification !== 'Hit' &&
    external_info.notification !== 'None' &&
    !_.isUndefined(external_info.notification)))
    return cb(Error.Validation('Alert is a reference, but notification type indicates otherwise'))
  
  try {
    const listings = await getListings(listing_ids)
    if (listings.length === 0) {
      cb(null, [])
      return []
    }
    
    const allRecoms = await createForListings(listings, room_id, external_info)
    const newOnes = allRecoms.filter(x => x.is_new)
    let user
    if (external_info.ref_user_id) {
      user = await getUser(external_info.ref_user_id)
    }
    const room = await promisify(getRoom)(room_id)
    // It seems in current implementation there is nothing wrong with calling listing_notification for each item
    // Since listing_notification's logic won't do anything. It looks for  external_info.notification to be either
    // of Hit or Share but because our kick off point calls Room.recommendListings with
    // {ref_alert_id: alert_id} as external_info.
    let found
    for (const n of newOnes) {
      found = listings.find(l => l.id === n.listing_id)
      await promisify(listing_notification)(found, room, user, n.id, external_info)
    }
    
    const newIds = newOnes.map(x => x.id)
    cb(null, newIds)
    return newIds
    
  } catch (e) {
    (function() {
      cb(e)
    })()
    throw e
  }
}

module.exports = {
  create,
  generateForListing,
  recommendListing,
  recommendListings,
}
