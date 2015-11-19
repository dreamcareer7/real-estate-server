/**
 * @namespace Branch
 */

var _u      = require('underscore');
var request = require('request');
var config  = require('../config.js');

Branch = {};

var options = {
  uri: config.branch.base_url,
  method: 'POST',
  json: {
    branch_key: config.branch.branch_key
  }
};

Branch.getURL = function(data, cb) {
  var _options = _u.clone(options);

  _options.uri += '/v1/url';
  _options.json.data = data;

  request(_options, function(err, response, body) {
    if(err)
      return cb(err);

    if(!body.url)
      return cb(Error.Branch('Branch url is invalid'));

    return cb(null, body.url);
  });
};
