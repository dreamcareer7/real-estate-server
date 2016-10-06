const config = require('../config.js')
const url = require('url')

Url = {}

Url.create = function(options, cb) {
  const getBrand = (cb) => {
    if (options.brand === false) // brand === false means NO Branding
      return cb()

    if(!options.brand) // brand === null|undefined means Current Brand

    Brand.get(options.brand, cb); // Brand explicitly defined
  }

  getBrand( (err, brand) => {
    if(err)
      return cb(err)

    hostname = (brand && brand.hostnames.length > 0)? brand.hostnames[0] : config.webapp.hostname

    cb(null, url.format({
      protocol: config.webapp.protocol,
      hostname: hostname,
      pathname: options.uri,
      query: options.query
    }))
  })
}

module.exports = function () {}
