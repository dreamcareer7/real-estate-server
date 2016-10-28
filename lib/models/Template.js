const nunj = require('nunjucks')
const moment = require('moment-timezone')

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

env.addFilter('square_feet', (sqm) => {
  return Listing.getSquareFeet(sqm)
})

env.addFilter('brand_color', (b, c, def) => {
  if (b && b.palette[c])
    return b.palette[c]

  return def
})

env.addFilter('brand_asset', (b, a, def) => {
  if (b && b.assets[a])
    return b.assets[a]

  return def
})

env.addFilter('brand_message', (b, a, def) => {
  if (b && b.messages[a])
    return b.messages[a]

  return def
})

Template.render = function (name, params, cb) {
  env.render(name, params, cb)
}
