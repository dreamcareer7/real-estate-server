var validator = require('../utils/validator.js');
var config = require('../config.js');
var url = require('url');

Url = {};

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true,
    }
  }
}

var validate = validator.bind(null, schema);

Url.create = function(options, cb) {
  var getBrand = (cb) => {
    if(!options.brand)
      return Brand.getCurrent(cb);

    Brand.get(options.brand, cb);
  }

  getBrand( (err, brand) => {
    if(err)
      return cb(err);

    base = brand ? brand.base_url : config.webapp.base_url.replace('https:\/\/', '').replace('http:\/\/', '');

    cb(null, url.format({
      protocol: 'http',
      hostname: base,
      pathname: options.uri,
      query: options.query
    }))
  })
}

module.exports = function(){};