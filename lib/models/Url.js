const config = require('../config.js')
const url = require('url')

Url = {}

Url.create = function (options, cb) {
  Brand.getCurrent((err, brand) => {
    if (err)
      return cb(err)

    const base = brand ? brand.base_url : config.webapp.base_url.replace('https:\/\/', '').replace('http:\/\/', '')

    cb(null, url.format({
      protocol: 'http',
      hostname: base,
      pathname: options.uri,
      query:    options.query
    }))
  })
}

module.exports = function () {}
