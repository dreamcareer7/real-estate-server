const config = require('../config.js')
const url = require('url')
const Brand = require('./Brand')

class Url {
  static web(options) {
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

  static api(options) {
    return url.format({
      protocol: config.url.protocol,
      port: config.url.port,
      hostname: config.url.hostname,
      pathname: options.uri,
      query: options.query
    })
  }
}

global['Url'] = Url
module.exports = Url
