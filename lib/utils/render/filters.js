const moment = require('moment-timezone')
const _ = require('lodash')
const numeral = require('numeral')
const emojify = require('emojify.js')
const indefinite = require('indefinite')
const Url = require('../../models/Url')

const { getLocalized } = require('../../models/Address/get')

const {
  getStatusHTMLColorCode,
  priceHumanReadable,
  getSquareFeet
} = require('../../models/Listing/format')

const {
  getDisplayName,
  getAbbreviatedDisplayName
} = require('../../models/User/get')

const filters = {
  time(timestamp, format, tz = 'US/Central') {
    if (_.isDate(timestamp)) {
      return moment(timestamp.getTime()).tz(tz).format(format)
    } else if (_.isString(timestamp)) {
      return moment(timestamp, moment.ISO_8601).tz(tz).format(format)
    }
    return moment(timestamp * 1000).tz(tz).format(format)
  },
  calendar(timestamp, tz) {
    return moment(timestamp * 1000).tz(tz).calendar()
  },
  date(timestamp, format) {
    if (_.isDate(timestamp)) {
      return moment.utc(timestamp.getTime()).format(format)
    }
    return moment.utc(timestamp * 1000).format(format)
  },
  notification_date(timestamp) {
    const m = moment.utc(timestamp * 1000)
    if (m.year() === 1800)
      return m.format('MMM D')
    
    return m.format('MMM D, YYYY')
  },
  spouse(contact, attribute) {
    if (attribute.is_partner) return `${contact.display_name}'s spouse (${contact.partner_name})`

    return contact.display_name
  },
  duration(d) {
    return moment.duration(d, 'seconds').humanize()
  },
  listing_status_color(listing) {
    return getStatusHTMLColorCode(listing.status)
  },
  listing_price(listing) {
    return priceHumanReadable(listing.price)
  },
  price(price) {
    return priceHumanReadable(price)
  },
  square_feet(sqm) {
    return getSquareFeet(sqm)
  },
  brand_color(b, c, def) {
    if (b && b.palette && b.palette[c])
      return b.palette[c]

    return def
  },
  listing_features(listing) {
    let t = ''

    if (!listing) return t

    if (listing.property && listing.property.bedroom_count)
      t += listing.property.bedroom_count + ' beds, '

    if (listing.property && listing.property.bathroom_count )
      t += listing.property.bathroom_count + ' baths, '

    if (listing.property && listing.property.square_meters)
      t += numeral(getSquareFeet(listing.property.square_meters)).format('0,0') + ' ft²'

    return t
  },
  describe_listing(listing) {
    let t = ''

    if (listing.property && listing.property.address)
      t += getLocalized(listing.property.address) + ': '

    if (listing.price)
      t += priceHumanReadable(listing.price) + ', '

    return t + filters.listing_features(listing)
  },
  brand_asset(b, a, def) {
    if (b && b.assets && b.assets[a])
      return b.assets[a]

    return def
  },
  name(user) {
    return getAbbreviatedDisplayName(user)
  },
  full_name(user) {
    return getDisplayName(user)
  },
  initials(name) {
    if (!name || name.length < 1) return ''

    return name.split(' ').map(p => p[0]).join('').replace(/[^A-Z]/g, '').substring(0, 3)
  },
  listing_address(listing) {
    return getLocalized(listing.property.address)
  },
  brand_message(b, a, def) {
    if (b && b.messages && b.messages[a])
      return b.messages[a]
  
    return def
  },
  url: options => {
    if (typeof options === 'string')
      return Url.web({
        uri: options
      })

    return Url.web(options)
  },
  emojify: emojify.replace,
  indefinite
}

module.exports = filters
