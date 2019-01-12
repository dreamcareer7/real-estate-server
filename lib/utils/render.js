const nunj = require('nunjucks')
const moment = require('moment-timezone')
const numeral = require('numeral')
const emojify = require('emojify.js')

const { Listing } = require('../models/Listing')
const Address = require('../models/Address')
const Url = require('../models/Url')

emojify.setConfig({
  img_dir: Url.web({
    brand: false,
    uri: '/static/images/emoji'
  })
})


const env = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production'
})
const env2 = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production',
  autoescape: false
})

const filters = {
  time(timestamp, format, tz = 'US/Central') {
    return moment(timestamp * 1000).tz(tz).format(format)
  },
  listing_status_color(listing) {
    return Listing.getStatusHTMLColorCode(listing.status)
  },
  listing_price(listing) {
    return Listing.priceHumanReadable(listing.price)
  },
  price(price) {
    return Listing.priceHumanReadable(price)
  },
  square_feet(sqm) {
    return Listing.getSquareFeet(sqm)
  },
  brand_color(b, c, def) {
    if (b && b.palette && b.palette[c])
      return b.palette[c]

    return def
  },
  describe_listing(listing) {
    let t = ''

    if (listing.property && listing.property.address)
      t += Address.getLocalized(listing.property.address) + ': '

    if (listing.price)
      t += Listing.priceHumanReadable(listing.price) + ', '

    if (listing.property && listing.property.bedroom_count)
      t += listing.property.bedroom_count + ' beds, '

    if (listing.property && listing.property.bathroom_count )
      t += listing.property.bathroom_count + ' baths, '

    if (listing.property && listing.property.square_meters)
      t += numeral(Listing.getSquareFeet(listing.property.square_meters)).format('0,0') + ' ft²'

    return t
  },
  brand_asset(b, a, def) {
    if (b && b.assets && b.assets[a])
      return b.assets[a]

    return def
  },
  name(user) {
    return User.getAbbreviatedDisplayName(user)
  },
  full_name(user) {
    return User.getDisplayName(user)
  },
  initials(name) {
    return name.split(' ').map(p => p[0]).join('').replace(/[^A-Z]/g, '').substring(0, 3)
  },
  listing_address(listing) {
    return Address.getLocalized(listing.property.address)
  },
  brand_message(b, a, def) {
    if (b && b.messages && b.messages[a])
      return b.messages[a]
  
    return def
  },
  emojify: emojify.replace,
}

for (const [name, filter] of Object.entries(filters)) {
  env.addFilter(name, filter)
  env2.addFilter(name, filter)
}

module.exports = {
  html: env.render.bind(env),
  text: env2.render.bind(env2),
}
