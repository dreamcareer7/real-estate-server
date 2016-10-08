const nunj = require('nunjucks')
const moment = require('moment-timezone')

Template = {}

const env = new nunj.configure()

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

Template.render = function (name, params, cb) {
  env.render(name, params, cb)
}
