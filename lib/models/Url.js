const config = require('../config.js')
const url = require('url')

Url = {}

Url.create = function(options) {
  const getBrand = () => {
    if (options.brand === false) // brand === false means NO Branding
      return

    if(options.brand) // brand is explicitly defined
      return options.brand

    // null/undefined means we should detect current brand
    return Brand.getCurrent()
  }

  const brand = getBrand()

  const hostname = (brand && brand.hostnames && brand.hostnames.length > 0) ? brand.hostnames[0] : config.webapp.hostname

  return url.format({
    protocol: config.webapp.protocol,
    port: config.webapp.port,
    hostname: hostname,
    pathname: options.uri,
    query: options.query
  })
}

module.exports = function () {}
