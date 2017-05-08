const db = require('../utils/db.js')
const _u = require('underscore')
const async = require('async')
const numeral = require('numeral')
const cu = require('convert-units')

const validator = require('../utils/validator.js')
const expect = validator.expect

Listing = {}
CompactListing = {}

Orm.register('listing', Listing)
Orm.register('compact_listing', CompactListing)

Listing.status_enum = [
  'Active',
  'Sold',
  'Pending',
  'Temp Off Market',
  'Leased',
  'Active Option Contract',
  'Active Contingent',
  'Active Kick Out',
  'Withdrawn',
  'Expired',
  'Cancelled',
  'Withdrawn Sublisting',
  'Incomplete',
  'Incoming',
  'Coming Soon'
]

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

    matrix_unique_id: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

function insert (listing, cb) {
  db.query('listing/insert', [
    listing.property_id,
    null, // listing_agent_id and
    null, // alerting_agent_id are deprecated
    listing.currency,
    listing.price,
    listing.status,
    listing.matrix_unique_id,
    listing.original_price,
    listing.last_price,
    listing.low_price,
    listing.association_fee,
    listing.association_fee_frequency,
    listing.association_fee_includes,
    listing.association_type,
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
    listing.capitalization_rate,
    listing.compensation_paid,
    listing.date_available,
    listing.last_status,
    listing.mls_area_major,
    listing.mls_area_minor,
    listing.mls,
    listing.move_in_date,
    listing.permit_address_internet_yn,
    listing.permit_comments_reviews_yn,
    listing.permit_internet_yn,
    listing.price_change_timestamp,
    listing.matrix_modified_dt,
    listing.property_association_fees,
    listing.showing_instructions_type,
    listing.special_notes,
    listing.tax_legal_description,
    listing.total_annual_expenses_include,
    listing.transaction_type,
    listing.virtual_tour_url_branded,
    listing.virtual_tour_url_unbranded,
    listing.active_option_contract_date,
    listing.keybox_type,
    listing.keybox_number,
    listing.close_date,
    listing.close_price,
    listing.back_on_market_date,
    listing.deposit_amount,
    listing.dom,
    listing.cdom,
    listing.buyers_agency_commission,
    listing.sub_agency_commission,
    listing.list_date,
    listing.showing_instructions,
    listing.appointment_phone,
    listing.appointment_phone_ext,
    listing.appointment_call,
    listing.owner_name,
    listing.seller_type,
    listing.occupancy,
    listing.private_remarks
  ], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].id)
  })
}

Listing.get = function (id, cb) {
  db.query('listing/get', [
    id,
    ObjectUtil.getCurrentUser()
  ], function (err, res_base) {
    if (err)
      return cb(err)

    if (res_base.rows.length < 1)
      return cb(Error.ResourceNotFound(`Listing ${id} not found`))

    const listing = res_base.rows[0]
    cb(null, listing)
  })
}

Listing.getCompacts = function (ids, cb) {
  db.query('listing/get_compacts', [
    ids,
    ObjectUtil.getCurrentUser()
  ], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}

// FIXME: Creating a listing requires all following parameters:
// A listing data, a property data and an address data. This also
// applies to updating. It's not clear at this point how we intend
// on designing this without any knowledge of the MLS protocol.
// Ref: #1 desc
Listing.create = function (listing, cb) {
  validate(listing, function (err) {
    if (err) {
      return cb(err)
    }

    return insert(listing, cb)
  })
}

Listing.update = function (id, listing, cb) {
  Listing.get(id, function (err, data) {
    if (err)
      return cb(err)

    db.query('listing/update', [
      null, // listing_agent_id and
      null, // alerting_agent_id are deprecated
      listing.currency,
      listing.price,
      listing.status,
      listing.original_price,
      listing.last_price,
      listing.low_price,
      listing.association_fee,
      listing.association_fee_frequency,
      listing.association_fee_includes,
      listing.association_type,
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
      listing.capitalization_rate,
      listing.compensation_paid,
      listing.date_available,
      listing.last_status,
      listing.mls_area_major,
      listing.mls_area_minor,
      listing.mls,
      listing.move_in_date,
      listing.permit_address_internet_yn,
      listing.permit_comments_reviews_yn,
      listing.permit_internet_yn,
      listing.price_change_timestamp,
      listing.matrix_modified_dt,
      listing.property_association_fees,
      listing.showing_instructions_type,
      listing.special_notes,
      listing.tax_legal_description,
      listing.total_annual_expenses_include,
      listing.transaction_type,
      listing.virtual_tour_url_branded,
      listing.virtual_tour_url_unbranded,
      listing.active_option_contract_date,
      listing.keybox_type,
      listing.keybox_number,
      listing.close_date,
      listing.close_price,
      listing.back_on_market_date,
      listing.deposit_amount,
      listing.dom,
      listing.cdom,
      listing.buyers_agency_commission,
      listing.sub_agency_commission,
      listing.list_date,
      listing.showing_instructions,
      listing.appointment_phone,
      listing.appointment_phone_ext,
      listing.appointment_call,
      listing.owner_name,
      listing.seller_type,
      listing.occupancy,
      listing.private_remarks,
      id],
             function (err, res) {
               if (err)
                 return cb(err)

               Listing.get(id, cb)
             })
  })
}

Listing.delete = function (id, cb) {
  db.query('listing/delete', [id], cb)
}

Listing.getByMUI = function (id, cb) {
  db.query('listing/get_mui', [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Listing ${id} not found.`))

    return Listing.get(res.rows[0].id, cb)
  })
}

Listing.getByMLSNumber = function (id, cb) {
  db.query('listing/get_mls_number', [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found.'))

    return Listing.get(res.rows[0].id, cb)
  })
}

Listing.matchingUsersByAlerts = function (id, cb) {
  Listing.get(id, (err, listing) => {
    if (err)
      return cb(err)

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
    ]

    db.query('listing/matching_users', vals, (err, res) => {
      if (err)
        return cb(err)

      const user_ids = res.rows.map(r => r.id)

      return cb(null, user_ids)
    })
  })
}

Listing.matchingRoomsByAlerts = function (id, cb) {
  Listing.get(id, (err, listing) => {
    if (err)
      return cb(err)

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
    ]

    db.query('listing/matching', vals, (err, res) => {
      if (err)
        return cb(err)

      return cb(null, res.rows)
    })
  })
}

Listing.getInterestedUsers = function (listing_id, cb) {
  db.query('listing/interested', [listing_id], function (err, res) {
    if (err)
      return cb(err)

    const users = res.rows.map(r => r.id)
    return cb(null, users)
  })
}

Listing.issueHitNotifications = function (listing_id, cb) {
  const notification = {}
  let address

  async.auto({
    listing: cb => {
      Listing.get(listing_id, cb)
    },
    users: [
      'listing',
      (cb, results) => {
        if(results.listing.status !== 'Active')
          return cb(null, [])

        Listing.matchingUsersByAlerts(listing_id, cb)
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
      'notification',
      (cb, results) => {
        async.map(results.users, (r, cb) => {
          const n = _u.clone(notification)
          n.object = r

          console.log('↯'.cyan, 'Recommending Listing with MUI:',
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
    if(err)
      return cb(err)

    return cb(null, listing_id)
  })
}

Listing.issueChangeNotifications = function (listing_id, before, after, cb) {
  const types = []

  if(after.status !== before.status)
    types.push('StatusChange')

  if(after.price !== before.price)
    types.push('PriceDrop')

  async.auto({
    listing: cb => {
      return Listing.get(listing_id, cb)
    },
    interested: cb => {
      if (_u.isEmpty(types))
        return cb(null, [])

      Listing.getInterestedUsers(listing_id, cb)
    },
    address: [
      'listing',
      (cb, results) => {
        const address_line = Address.getLocalized(results.listing.property.address)

        return cb(null, address_line)
      }
    ],
    price_drop_trigger: [
      'address',
      'listing',
      'interested',
      (cb, results) => {
        if (!_u.contains(types, 'PriceDrop'))
          return cb()

        async.map(results.interested, (interested, cb) => {
          const notification = {}

          notification.subject_class = 'Listing'
          notification.subject = listing_id
          notification.action = 'PriceDropped'
          notification.object_class = 'User'
          notification.object = interested

          if (!before.price || before.price === 0)
            notification.message = `[New Price] ${results.address} is now ${Listing.priceHumanReadable(after.price)}`
          else
            notification.message = `[Price Change] ${results.address} went from ${Listing.priceHumanReadable(before.price)} to ${Listing.priceHumanReadable(after.price)}`

          console.log('Price Drop Notification:'.cyan,
          ('#' + results.listing.matrix_unique_id).red,
          '('.cyan, results.listing.id.yellow, ')'.cyan,
          '*'.blue, results.address, '*'.blue,
          'MLS#:'.white, results.listing.mls_number,
          'was:'.white, Listing.priceHumanReadable(before.price),
          'is now:'.white, Listing.priceHumanReadable(after.price))

          return Notification.issueForUser(notification, interested, cb)
        }, cb)
      }
    ],
    status_change_trigger: [
      'listing',
      'address',
      'interested',
      (cb, results) => {
        if (!_u.contains(types, 'StatusChange'))
          return cb()

        async.map(results.interested, (interested, cb) => {
          const notification = {}

          notification.subject_class = 'Listing'
          notification.subject = listing_id
          notification.action = 'StatusChanged'
          notification.object_class = 'User'
          notification.object = interested
          notification.message = `${results.address} is now ${after.status}`

          console.log('Status Change Notification:'.cyan,
          ('#' + results.listing.matrix_unique_id).red,
          '('.cyan, results.listing.id.yellow, ')'.cyan,
          '*'.blue, results.address, '*'.blue,
          'were:'.white, before.status, 'is now:'.white, after.status)

          Notification.issueForUser(notification, interested, cb)
        }, cb)
      }
    ],
    touch: [
      'price_drop_trigger',
      'status_change_trigger',
      (cb, results) => {
        if (_u.isEmpty(types))
          return cb()

        Listing.touch(listing_id, types[0], cb)
      }
    ]
  }, cb)
}

Listing.touch = function(listing_id, last_update, cb) {
  db.query('listing/touch', [listing_id, last_update], cb)
}

Listing.touchByMUI = function(mui, last_update, cb) {
  db.query('listing/touch_mui', [mui, last_update], cb)
}

Listing.stringSearch = function (query, status, cb) {
  expect(status).to.be.a('array')

  db.query('listing/string_search', [
    query.replace(/,/g, ' '),
    status
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const listing_ids = res.rows.map(r => r.id)

    Listing.getCompacts(listing_ids, (err, listings) => {
      return cb(err, listings)
    })
  })
}

Listing.getStatuses = function (cb) {
  db.query('listing/get_statuses', [], (err, res) => {
    if (err)
      return cb(err)

    const states = res.rows.map(row => row.state)
    return cb(null, states)
  })
}

Listing.getByArea = function (q, statuses, cb) {
  const areas = Alert.parseArea(q)

  db.query('listing/area/get_by_area', [
    areas.mls_area_major,
    areas.mls_area_minor,
    statuses
  ], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const listing_ids = res.rows.map(function (r) {
      return r.id
    })

    Listing.getCompacts(listing_ids, (err, listings) => {
      return cb(err, listings)
    })
  })
}

function publicizeSensitive (l) {
  const user = process.domain.user
  const type = user ? user.user_type : 'Guest'

  const properties = {
//     sub_agency_commission:              ['Agent', 'Brokerage'],
//     close_price:                        ['Agent', 'Brokerage'],
//     buyers_agency_commission:           ['Agent', 'Brokerage'],
//     listing_agreement:                  ['Agent', 'Brokerage'],
//     list_agent_mls_id:                  ['Agent', 'Brokerage'],
//     private_remarks:                    ['Agent', 'Brokerage'],
//     appointment_call:                   ['Agent', 'Brokerage'],
//     appointment_phone:                  ['Agent', 'Brokerage'],
//     owner_name:                         ['Agent', 'Brokerage'],
//     keybox_number:                      ['Agent', 'Brokerage'],
//     keybox_type:                        ['Agent', 'Brokerage'],
//     showing_instructions:               ['Agent', 'Brokerage'],
//     occupancy:                          ['Agent', 'Brokerage'],
//     seller_type:                        ['Agent', 'Brokerage'],
//     list_agent_direct_work_phone:       ['Agent', 'Brokerage'],
//     list_agent_email:                   ['Agent', 'Brokerage'],
//     co_list_agent_direct_work_phone:    ['Agent', 'Brokerage'],
//     co_list_agent_email:                ['Agent', 'Brokerage'],
//     selling_agent_direct_work_phone:    ['Agent', 'Brokerage'],
//     selling_agent_email:                ['Agent', 'Brokerage'],
//     co_selling_agent_direct_work_phone: ['Agent', 'Brokerage'],
//     co_selling_agent_email:             ['Agent', 'Brokerage'],
//     list_office_phone:                  ['Agent', 'Brokerage'],
//     co_list_office_phone:               ['Agent', 'Brokerage'],
//     selling_office_phone:               ['Agent', 'Brokerage'],
//     co_selling_office_phone:            ['Agent', 'Brokerage']
  }

  Object.keys(properties).forEach(name => {
    const allowed = properties[name]

    if (allowed.indexOf(type) < 0)
      delete l[name]
  })
}

function calculateDom (listing) {
  const actives = [
    'Active',
    'Pending',
    'Temp Off Market',
    'Active Option Contract',
    'Active Contingent',
    'Active Kick Out'
  ]

  if (actives.indexOf(listing.status) < 0)
    return

  listing.dom = Math.trunc(((new Date()).getTime() - (listing.list_date * 1000)) / 86400000)
}

Listing.publicize = function (model) {
  if (model.property) Property.publicize(model.property)

  delete model.property_id
  delete model.property.address_id

  publicizeSensitive(model)
  calculateDom(model)

  return model
}

Listing.getStatusHTMLColorCode = function (status) {
  switch (status) {
  case 'Active':
    return '#35b863'

  case 'Coming Soon':
    return '#00f0ff'

  case 'Pending':
  case 'Active Contingent':
  case 'Active Kick Out':
  case 'Active Option Contract':
    return '#f8b619'

  case 'Leased':
  case 'Expired':
  case 'Sold':
  case 'Cancelled':
    return '#db3821'

  default:
    return '#9b9b9b'
  }
}

Listing.priceHumanReadable = function (price) {
  if (!price || typeof (price) !== 'number')
    return ''

  return '$' + numeral(price).format('0,0')
}

Listing.getSquareFeet = function (square_meters) {
  if (!square_meters || typeof (square_meters) !== 'number')
    return 'N/A'

  return cu(square_meters).from('m2').to('ft2')
}

Listing.inquiry = function (user_id, listing_id, agent_id, brand_id, source_type, external_info, cb) {
  async.auto({
    user: cb => {
      return User.get(user_id, cb)
    },
    brand: cb => {
      return Brand.get(brand_id, cb)
    },
    agent: cb => {
      if (!agent_id)
        return cb()

      return Agent.get(agent_id, cb)
    },
    listing: cb => {
      return Listing.get(listing_id, cb)
    },
    in_user: [
      'brand',
      'agent',
      'listing',
      (cb, results) => {
        if (results.agent && results.agent.user_id)
          return cb(null, results.agent.user_id)

        Brand.proposeUserForListingInquiry(results.brand.id, results.listing.id, (err, user) => {
          if (err)
            return cb(err)

          if (!user)
            return cb(Error.Validation('Cannot find an agent to make an inquiry for this listing'))

          return cb(null, user.id)
        })
      }
    ],
    room: [
      'in_user',
      (cb, results) => {
        return User.connectToUser(user_id, results.in_user, source_type, brand_id, cb)
      }
    ],
    recommendation: [
      'in_user',
      'room',
      (cb, results) => {
        external_info.ref_user_id = results.in_user
        return Room.recommendListing(results.room, listing_id, external_info, cb)
      }
    ],
    message: [
      'room',
      'recommendation',
      'in_user',
      (cb, results) => {
        const message = {
          author: results.in_user,
          recommendation: results.recommendation.id,
          message_type: 'SubLevel',
          comment: 'I see that you\'re interested in this house. Let me know how I can help you.'
        }

        return Message.post(results.room, message, true, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, {
      action: 'listing_inquiry',
      listing: listing_id,
      room: results.room,
      agent: agent_id
    })
  })
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

Listing.getArea = function (pair, cb) {
  db.query('listing/area/get', pair, (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('MLS Area not found'))

    const area = res.rows[0]

    area.id = pair.toString()

    cb(null, area)
  })
}

MLSArea = {
  get: Listing.getArea
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

Listing.facebookShare = function (options, cb) {
  // options.listing  Listing ID
  // options.user     User ID
  // options.message  Text Message
  // options.photo    Photo URL

  Listing.get(options.listing, (err, listing) => {
    if (err)
      return cb(err)

    if (!options.photo)
      options.photo = listing.cover_image_url

    const url = Url.web({
      uri: '/dashboard/mls/' + listing.id
    })

    Facebook.share({
      message: options.message,
      photo: options.photo,
      user: options.user,
      url
    }, cb)
  })
}

CompactListing.publicize = function (model) {
  if (model.total) delete model.total

  publicizeSensitive(model)
  calculateDom(model)

  return model
}

CompactListing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent',
    enabled: false
  },

  list_office: {
    optional: true,
    model: 'Office',
    enabled: false
  },

  selling_agent: {
    optional: true,
    model: 'Agent',
    enabled: false
  },

  selling_office: {
    optional: true,
    model: 'Office',
    enabled: false
  }
}

Listing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent'
  }
}

module.exports = function () {}
