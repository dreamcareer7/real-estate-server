const nunj = require('nunjucks')
const moment = require('moment-timezone')
const numeral = require('numeral')

Template = {}

const env = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production'
})

env.addFilter('time', (timestamp, format, tz = 'US/Central') => {
  return moment(timestamp * 1000).tz(tz).format(format)
})

env.addFilter('listing_status_color', (listing) => {
  return Listing.getStatusHTMLColorCode(listing.status)
})

env.addFilter('listing_price', (listing) => {
  return Listing.priceHumanReadable(listing.price)
})

env.addFilter('price', (price) => {
  return Listing.priceHumanReadable(price)
})

env.addFilter('square_feet', (sqm) => {
  return Listing.getSquareFeet(sqm)
})

env.addFilter('brand_color', (b, c, def) => {
  if (b && b.palette && b.palette[c])
    return b.palette[c]

  return def
})

env.addFilter('describe_listing', (listing) => {
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
})

env.addFilter('brand_asset', (b, a, def) => {
  if (b && b.assets && b.assets[a])
    return b.assets[a]

  return def
})

env.addFilter('name', (user) => {
  return User.getAbbreviatedDisplayName(user)
})

env.addFilter('full_name', (user) => {
  return User.getDisplayName(user)
})

env.addFilter('listing_address', (listing) => {
  return Address.getLocalized(listing.property.address)
})

env.addFilter('brand_message', (b, a, def) => {
  if (b && b.messages && b.messages[a])
    return b.messages[a]

  return def
})

Template.render = function (name, params, cb) {
  env.render(name, params, cb)
}
