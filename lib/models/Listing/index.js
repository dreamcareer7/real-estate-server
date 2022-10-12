const db = require('../../utils/db')
const tsquery = require('../../utils/tsquery')

const _u = require('underscore')
const async = require('async')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const AlertSetting = require('../Alert/setting')
const Context = require('../Context')
const ListingSetting = require('../Listing/setting')
const Notification = require('../Notification/issue')
const Address = require('../Address')
const Recommendation = require('../Recommendation/create')
const Property = require('../Property/create')
const Alert = require('../Alert/get')

require('./setting')

const Listing = {
  ...require('./format'),
  ...require('./constants'),
  ...require('./get'),
  ...require('./recommendation'),

  notify: require('./notify-agents')
}

const schema = {
  type: 'object',
  properties: {
    property_id: {
      type: 'string',
      required: true,
      uuid: true
    },

    status: {
      type: 'string',
      required: 'true',
      enum: Listing.status_enum
    },

    price: {
      type: 'number',
      required: true
    },

    matrix_unique_id: {
      type: ['string', 'number'],
      required: true
    },

    mls: {
      type: ['string'],
      required: true
    },

    mls_number: {
      type: ['string'],
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

function insert(listing, cb) {
  Context.log(`(Listing.create->insert) Saving listing ${listing.matrix_unique_id} rev. ${listing.revision} to db.`)

  db.query('listing/insert', [
    listing.property_id,
    listing.price,
    listing.status,
    listing.matrix_unique_id,
    listing.original_price,
    listing.last_price,
    listing.association_fee,
    listing.association_fee_frequency,
    listing.association_fee_includes,
    listing.mls_number,
    listing.unexempt_taxes,
    listing.financing_proposed,
    listing.list_office_mui,
    listing.list_office_mls_id,
    listing.list_office_name,
    listing.list_office_phone,
    listing.co_list_office_mui,
    listing.co_list_office_mls_id,
    listing.co_list_office_name,
    listing.co_list_office_phone,
    listing.selling_office_mui,
    listing.selling_office_mls_id,
    listing.selling_office_name,
    listing.selling_office_phone,
    listing.co_selling_office_mui,
    listing.co_selling_office_mls_id,
    listing.co_selling_office_name,
    listing.co_selling_office_phone,
    listing.list_agent_mui,
    listing.list_agent_direct_work_phone,
    listing.list_agent_email,
    listing.list_agent_full_name,
    listing.list_agent_mls_id,
    listing.co_list_agent_mui,
    listing.co_list_agent_direct_work_phone,
    listing.co_list_agent_email,
    listing.co_list_agent_full_name,
    listing.co_list_agent_mls_id,
    listing.selling_agent_mui,
    listing.selling_agent_direct_work_phone,
    listing.selling_agent_email,
    listing.selling_agent_full_name,
    listing.selling_agent_mls_id,
    listing.co_selling_agent_mui,
    listing.co_selling_agent_direct_work_phone,
    listing.co_selling_agent_email,
    listing.co_selling_agent_full_name,
    listing.co_selling_agent_mls_id,
    listing.listing_agreement,
    listing.possession,
    listing.mls_area_major,
    listing.mls_area_minor,
    listing.mls_name,
    listing.matrix_modified_dt,
    listing.showing_instructions_type,
    listing.tax_legal_description,
    listing.keybox_type,
    listing.keybox_number,
    listing.close_date,
    listing.close_price,
    listing.dom,
    listing.cdom,
    listing.buyers_agency_commission,
    listing.sub_agency_commission,
    listing.list_date,
    listing.showing_instructions,
    listing.appointment_phone,
    listing.appointment_phone_ext,
    listing.appointment_call,
    listing.occupancy,
    listing.private_remarks,
    listing.application_fee,
    listing.mls,
    listing.revision,
    listing.original_mls_property_type,
    listing.original_mls_property_subtype,
    listing.original_mls_status,
    listing.transaction_type,
    listing.usage_type,
    listing.structure_type,
    listing.is_address_public ?? true,
    listing.parcel_number,
    listing.public_display ?? true,
    listing.annual_tax,
    listing.virtual_tour,
    listing.sub_agency_offered,
    listing.transaction_broker_commission,
    listing.compensation_based_on
  ], cb)
}

class ListingRevisionConflictError extends Error {
  constructor(current_rev, new_rev) {
    super(`Trying to process revision ${new_rev} while revision ${current_rev} is currently in the database. Aborting...`)
  }
}

Listing.create = function ({ address, property, listing, revision, ignoreRevision }, cb) {
  Context.log('Processing Listing', listing.matrix_unique_id, 'with revision', revision)

  const lock = (cb) => {
    db.query('listing/lock', [
      listing.matrix_unique_id,
      listing.mls
    ], (err, res) => {
      if (err) {
        return cb(err)
      }

      if (res.rows.length > 0 && !ignoreRevision) {
        const rev = res.rows[0].revision

        if (revision <= rev) {
          Context.log()
          return cb(new ListingRevisionConflictError(rev, revision))
        }
      }

      cb()
    })
  }

  const agentNotification = (cb, results) => {
    const shouldSendJustSoldEmail = results.old && results.old.status !== results.listing.status && results.listing.status === 'Sold'
    if (shouldSendJustSoldEmail) {
      return Listing.notify.justSold(results.listing.id).nodeify(cb)
    }
    
    if (results.old)
      return cb()

    Listing.notify.justListed(results.listing.id).nodeify(cb)
  }

  async.auto({
    lock: lock,
    old: ['lock', getOld],
    address: ['lock', saveAddress],
    geo: ['address', geocode],
    property: ['address', 'geo', saveProperty],
    validate: ['address', 'property', cb => validate(listing, (err) => {
      if (err) {
        err.message = err.message.replace('Validation Error', `Validation Error(${listing.mls}):`)
      }
      return cb(err)
    })],
    saved: ['property', saveListing],
    listing: ['saved', getNew],
    notification: ['listing', 'old', notification],
    recommendation: ['notification', recommendation],
    agent_notification: ['listing', agentNotification]
  }, (err, res) => {
    if (err) {
      if (err instanceof ListingRevisionConflictError) {
        Context.log(err.message)
        return cb()
      }

      Context.log('Listing.create-async.auto failed:', listing.matrix_unique_id, revision, err)
      return cb(err)
    }

    Context.log('Listing.create-async.auto completed:', listing.matrix_unique_id, revision)
    cb(undefined, res)
  })

  function saveAddress(cb, results) {
    Context.log('Saving listing address', listing.matrix_unique_id)
    Address.create(address).nodeify(cb)
  }

  function geocode(cb, results) {
    Context.log('Updating listing address', listing.matrix_unique_id)
    if (Array.isArray(address.geocode) && address.geocode.length > 0) {
      /**
       * @type {import('../../../types/models/MLS').IRechatGeocode}
       */
      const geo_result = address.geocode[0]
      switch (geo_result.geo_source) {
        case 'Mapbox':
          Context.log(`Update pre-geocode results from ${geo_result.geo_source}.`)
          Address.updateLatLongMapbox(results.address, geo_result).then(
            res => Address.updateLatLong(res.id, res.location, { source: 'Mapbox', approximate: geo_result.approximate }, cb),
            err => cb(err)
          ).catch(cb)
          break
        case 'MLS':
          Context.log(`Update pre-geocode results from ${geo_result.geo_source}.`)
          Address.updateLatLongMLS(results.address, geo_result.longitude, geo_result.latitude).then(
            res => cb(null, res),
            err => {
              Context.error(err)
              cb(err)
            }
          )

          break

        default:
          Context.log(`Pre-geocode results from ${geo_result.geo_source} is not supported yet.`)
          break
      }
    } else {
      Address.updateGeo(results.address, cb)
    }
  }

  function saveProperty(cb, results) {
    Context.log('Saving listing property', listing.matrix_unique_id)
    property.address_id = results.address
    Property.create(property).nodeify((err, property_id) => {
      if (err) {
        Context.log('Property.create failed:', err)
        return cb(err)
      }

      cb(undefined, property_id)
    })
  }

  function saveListing(cb, results) {
    Context.log('Saving listing', listing.matrix_unique_id)
    listing.property_id = results.property
    listing.revision = revision
    insert(listing, (err, res) => {
      if (err) {
        Context.log('Listing.create failed:', err)
        return cb(err)
      }

      cb(undefined, res)
    })
  }

  function notification(cb, results) {
    const id = results.listing.id

    Context.log('Issueing notification', Boolean(results.old))

    if (results.old)
      Listing.issueChangeNotifications(id, results.old, results.listing, (err, res) => {
        if (err) {
          Context.log('Listing.create-issueChangeNotifications failed:', err)
          return cb(err)
        }

        cb(undefined, res)
      })
    else
      Listing.issueHitNotifications(id, (err, res) => {
        if (err) {
          Context.log('Listing.create-issueHitNotifications failed:', err)
          return cb(err)
        }

        cb(undefined, res)
      })
  }

  function getOld(cb) {
    Context.log('Getting old listing', listing.matrix_unique_id)
    Listing.getByMUI(listing.matrix_unique_id, listing.mls).nodeify((err, listing) => {
      if (err) // Its just a new listing
        return cb()

      cb(null, listing)
    })
  }

  function getNew(cb, results) {
    Context.log('Getting new listing address', listing.matrix_unique_id)
    Listing.get(results.saved.rows[0].id, (err, res) => {
      if (err) {
        Context.log('Listing.create-getNew failed:', err)
        return cb(err)
      }

      cb(undefined, res)
    })
  }

  function recommendation(cb, results) {
    Context.log('Creating recommendation for listing', listing.matrix_unique_id)
    const id = results.saved.rows[0].id
    Recommendation.generateForListing(id, (err, res) => {
      if (err) {
        Context.log('Recommendation.generateForListing failed:', err)
        return cb(err)
      }

      if (Array.isArray(res)) {
        Context.log(`Created ${res.length} recommendations.`)
      }
      else {
        Context.log('Skipped creating recommendations. The listing is not active.')
      }

      cb(undefined, res)
    })
  }
}

// Finds people that are already in the list of recommendations
Listing.getInterestedUsers = function (listing_id, cb) {
  db.query('listing/interested', [listing_id], function (err, res) {
    if (err)
      return cb(err)

    const users = res.rows.map(r => r.id)
    return cb(null, users)
  })
}

Listing.issueHitNotifications = function (listing_id, cb) {
  Context.log('Issuing Hit Notification')

  const notification = {}
  let address

  async.auto({

    listing: cb => {
      Listing.get(listing_id, cb)
    },

    users: [
      'listing',
      (cb, results) => {
        if (results.listing.status !== 'Active')
          return cb(null, [])

        Alert.matchingUsersByAlerts(results.listing, cb)
      }
    ],

    interestedUsers: [
      'users',
      // 'alerts',
      (cb, results) => {
        AlertSetting.filterUsersWithStatus(results.users.user_ids,
          results.users.alert_ids, ['AlertHit']).nodeify(cb)
      }
    ],

    notification: [
      'listing',
      (cb, results) => {
        address = Address.getLocalized(results.listing.property.address)

        notification.subject = listing_id
        notification.subject_class = 'Listing'
        notification.object_class = 'User'
        notification.action = 'BecameAvailable'
        notification.message = `${address} just hit the market`

        return cb()
      }
    ],

    send: [
      'listing',
      'users',
      'interestedUsers',
      'notification',
      function (cb, results) {
        const userIDs = results.interestedUsers.map(u => u.id)
        Context.log('Creating Notifications for', userIDs)

        const sentUsers = []
        async.map(userIDs, (r, cb) => {
          if (sentUsers.includes(r)) {
            return cb()
          }
          sentUsers.push(r)
          const n = _u.clone(notification)
          n.object = r

          Context.log('↯'.cyan, 'Recommending Listing with MUI:',
            ('#' + results.listing.matrix_unique_id).red,
            '('.cyan, results.listing.id.yellow, ')'.cyan,
            '*'.blue, address, '*'.blue,
            'MLS#:'.white, results.listing.mls_number.yellow
          )

          Notification.issueForUser(n, r, cb)
        }, cb)
      }
    ]

  }, err => {
    if (err)
      return cb(err)

    return cb(null, listing_id)
  })
}

Listing.issueChangeNotifications = function (listing_id, before, after, cb) {
  const types = []

  if (after.status !== before.status)
    types.push('StatusChange')

  if (after.price !== before.price)
    types.push('PriceDrop')

  Context.log('Issuing change notification', types)

  async.auto({

    listing: cb => {
      return Listing.get(listing_id, cb)
    },

    usersInterestedInListing: cb => {
      ListingSetting.getUsersWithStatus([listing_id], ['ListingStatusChange', 'ListingPriceDrop']).nodeify(cb)
    },

    // interested: cb => {
    //   if (_u.isEmpty(types))
    //     return cb(null, [])

    //   Listing.getInterestedUsers(listing_id, cb)
    // },

    matchingUsers: ['listing', (cb, results) => {
      Alert.matchingUsersByAlerts(results.listing, cb)
    }],

    usersWithAlertEnabled: [
      // 'interested',
      'matchingUsers',
      // 'alerts',
      (cb, results) => {
        AlertSetting.filterUsersWithStatus(results.matchingUsers.user_ids,
          results.matchingUsers.alert_ids, ['AlertStatusChange', 'AlertPriceDrop'])
          .nodeify(cb)
        // AlertSetting.getUsersWithStatus(results.interested,
        //   results.matchingUsers.alert_ids,
        //   ['AlertStatusChange', 'AlertPriceDrop', 'AlertOpenHouse']).nodeify((err, res) => {
        //   if (err) {
        //     return cb(err)
        //   }
        // })
      }
    ],

    address: [
      'listing',
      (cb, results) => {
        const address_line = Address.getLocalized(results.listing.property.address)

        return cb(null, address_line)
      }
    ],

    // TODO: (Javad) => still needs handling new users notification with different message
    price_drop_trigger: [
      'address',
      'listing',
      'usersWithAlertEnabled',
      'usersInterestedInListing',
      (cb, results) => {
        if (!_u.contains(types, 'PriceDrop'))
          return cb()
        const sentUsers = []
        const allUsers = results.usersWithAlertEnabled.concat(results.usersInterestedInListing)
        async.map(allUsers, (interested, cb) => {
          if ((!interested.status.includes('AlertPriceDrop') &&
            !interested.status.includes('ListingPriceDrop')) ||
            sentUsers.includes(interested.id)) {
            return cb()
          }
          sentUsers.push(interested.id)
          const notification = {}

          notification.subject_class = 'Listing'
          notification.subject = listing_id
          notification.action = 'PriceDropped'
          notification.object_class = 'User'
          notification.object = interested.id

          if (!before.price || before.price === 0)
            notification.message = `[New Price] ${results.address} is now ${Listing.priceHumanReadable(after.price)}`
          else
            notification.message = `[Price Change] ${results.address} went from ${Listing.priceHumanReadable(before.price)} to ${Listing.priceHumanReadable(after.price)}`

          Context.log('Price Drop Notification:'.cyan,
            ('#' + results.listing.matrix_unique_id).red,
            '('.cyan, results.listing.id.yellow, ')'.cyan,
            '*'.blue, results.address, '*'.blue,
            'MLS#:'.white, results.listing.mls_number,
            'was:'.white, Listing.priceHumanReadable(before.price),
            'is now:'.white, Listing.priceHumanReadable(after.price),
            'sent to'.white, interested.id)

          return Notification.issueForUser(notification, interested.id, cb)
        }, cb)

        // async.map(results.usersWithAlertEnabled.newUsers, (newUser, cb) => {
        //   const notification = {}

        //   notification.subject_class = 'Listing'
        //   notification.subject = listing_id
        //   notification.action = 'PriceDropped'
        //   notification.object_class = 'User'
        //   notification.object = newUser

        //   if (!before.price || before.price === 0)
        //     notification.message = `[New Price] ${results.address} is now ${Listing.priceHumanReadable(after.price)}`
        //   else
        //     notification.message = `[Price Change] ${results.address} went from ${Listing.priceHumanReadable(before.price)} to ${Listing.priceHumanReadable(after.price)}`

        //   Context.log('Price Drop Notification:'.cyan,
        //     ('#' + results.listing.matrix_unique_id).red,
        //     '('.cyan, results.listing.id.yellow, ')'.cyan,
        //     '*'.blue, results.address, '*'.blue,
        //     'MLS#:'.white, results.listing.mls_number,
        //     'was:'.white, Listing.priceHumanReadable(before.price),
        //     'is now:'.white, Listing.priceHumanReadable(after.price))

        //   return Notification.issueForUser(notification, newUser, cb)
        // }, cb)
      }
    ],

    // TODO: (Javad) => still needs handling new users notification with different message
    status_change_trigger: [
      'listing',
      'address',
      'usersWithAlertEnabled',
      'usersInterestedInListing',
      (cb, results) => {
        if (!_u.contains(types, 'StatusChange'))
          return cb()

        const sentUsers = []
        const allUsers = results.usersWithAlertEnabled.concat(results.usersInterestedInListing)
        async.map(allUsers, (interested, cb) => {
          if ((!interested.status.includes('ListingStatusChange') &&
            !interested.status.includes('AlertStatusChange')) ||
            sentUsers.includes(interested.id)) {
            return cb()
          }
          sentUsers.push(interested.id)
          const notification = {}

          notification.subject_class = 'Listing'
          notification.subject = listing_id
          notification.action = 'StatusChanged'
          notification.object_class = 'User'
          notification.object = interested.id
          notification.message = `${results.address} is now ${after.status}`

          Context.log('Status Change Notification:'.cyan,
            ('#' + results.listing.matrix_unique_id).red,
            '('.cyan, results.listing.id.yellow, ')'.cyan,
            '*'.blue, results.address, '*'.blue,
            'were:'.white, before.status, 'is now:'.white, after.status)

          Notification.issueForUser(notification, interested.id, cb)
        }, cb)

        // async.map(results.usersWithAlertEnabled.newUsers, (newUser, cb) => {
        //   const notification = {}

        //   notification.subject_class = 'Listing'
        //   notification.subject = listing_id
        //   notification.action = 'StatusChanged'
        //   notification.object_class = 'User'
        //   notification.object = newUser
        //   notification.message = `${results.address} is now ${after.status}`

        //   Context.log('Status Change Notification:'.cyan,
        //     ('#' + results.listing.matrix_unique_id).red,
        //     '('.cyan, results.listing.id.yellow, ')'.cyan,
        //     '*'.blue, results.address, '*'.blue,
        //     'were:'.white, before.status, 'is now:'.white, after.status)

        //   Notification.issueForUser(notification, newUser, cb)
        // }, cb)
      }
    ],

    touch: [
      'price_drop_trigger',
      'status_change_trigger',
      // 'open_house_trigger',
      (cb, results) => {
        if (_u.isEmpty(types))
          return cb()

        Listing.touch(listing_id, types[0]).nodeify(cb)
      }
    ],

    agent_notification: [
      'listing',
      (cb, results) => {
        if (!_u.contains(types, 'PriceDrop') || results.listing.status !== 'Active')
          return cb()

        Listing.notify.priceImprovement(results.listing.id).nodeify(cb)
      }
    ]
  }, cb)
}

Listing.touch = async (listing_id, last_update) => {
  return db.query.promise('listing/touch', [
    listing_id,
    last_update
  ])
}

Listing.stringSearch = async function ({ query, status, limit }) {
  if (status)
    expect(status).to.be.a('array')

  const { rows } = await db.query.promise('listing/string_search', [
    tsquery(query),
    status,
    limit
  ])

  if (rows.length < 1)
    return []

  const ids = rows.map(r => r.id)

  const listings = await Listing.getCompacts(ids)

  return listings
}

Listing.getByArea = async function (q, statuses, cb) {
  const areas = Alert.parseArea(q)

  const listing_ids = await db.selectIds('listing/area/get_by_area', [
    areas.mls_area_major,
    areas.mls_area_minor,
    statuses
  ])

  return Listing.getCompacts(listing_ids)
}

Listing.refreshAreas = function (cb) {
  db.query('listing/area/refresh', [], cb)
}

Listing.searchAreas = function (term, parents, cb) {
  db.query('listing/area/search', [term, parents], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

Listing.refreshCounties = function (cb) {
  db.query('listing/county/refresh', [], cb)
}

Listing.searchCounties = function (term, cb) {
  db.query('listing/county/search', [term], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

Listing.refreshSubdivisions = function (cb) {
  db.query('listing/subdivision/refresh', [], cb)
}

Listing.searchSubdivisions = function (term, cb) {
  db.query('listing/subdivision/search', [term], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

Listing.updateStatus = function ({ muis, mls, status }, cb) {
  db.query('listing/update_status', [muis, mls, status], cb)
}

Listing.delete = function ({ muis, mls }, cb) {
  db.query('listing/delete', [muis, mls], cb)
}


module.exports = { Listing }
