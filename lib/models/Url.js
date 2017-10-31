const config = require('../config.js')
const url = require('url')

Url = {}

Url.web = function(options) {
  const getBrand = () => {
    if (options.brand === false) // brand === false means NO Branding
      return

    if(options.brand) // brand is explicitly defined
      return options.brand

    // null/undefined means we should detect current brand
    return Brand.getCurrent()
  }

  let brand = getBrand()
  let hostname = config.webapp.hostname

  while(brand) {
    if (brand.hostnames && brand.hostnames.length > 0) {
      hostname = brand.hostnames[0]
      break
    }

    brand = brand.parent
  }

  return url.format({
    protocol: config.webapp.protocol,
    port: config.webapp.port,
    hostname: hostname,
    pathname: options.uri,
    query: options.query
  })
}

Url.api = function(options) {
  return url.format({
    protocol: config.url.protocol,
    port: config.url.port,
    hostname: config.url.hostname,
    pathname: options.uri,
    query: options.query
  })
}

module.exports = function () {}
