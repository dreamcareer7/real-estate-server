/**
 * @namespace Branch
 */

var _u      = require('underscore');
var request = require('request');
var config  = require('../config.js');

Branch = {};

var options = {
  uri: config.branch.base_url,
  json: {
    branch_key: config.branch.branch_key
  }
};

Branch.createURL = function(data, cb) {
  var _options = _u.clone(options);

  _options.method = 'POST';
  _options.uri += '/v1/url';
  _options.json.data = data;

  request(_options, (err, response, body) => {
    if(err)
      return cb(err);

    if(!body)
      return cb(Error.Branch('Branch response is empty'));

    if(!body.url)
      return cb(Error.Branch('Branch url is invalid'));

    return cb(null, body.url);
  });
};

Branch.getURL = function(url, cb) {
  var _options = _u.clone(options);

  _options.method = 'GET';
  _options.uri += '/v1/url';
  _options.qs = {
    url: url,
    branch_key: config.branch.branch_key
  };

  request(_options, (err, response, body) => {
    if(err)
      return cb(err);

    if(!body)
      return cb(Error.Branch('Branch url does not exist'));

    return cb(null, body);
  });
};
