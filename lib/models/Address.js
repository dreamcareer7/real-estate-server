var validator = require('validator');
var db = require('../utils/db.js');

Address = {};

Address.validate = function(address, cb) {
  var required = ['type', 'title', 'subtitle'];
  for(var i in required) {
    var p = required[i];

    if(validator.isNull(address[p])) {
      return cb(Error.Validation(p+' is required'));
    }

    var min = 4;
    if(validator.isLength(min, address[p])) {
      return cb(Error.Validation(p+' needs to be at least '+min+' characters.'));
    }
  }

  cb();
}

module.exports = function(){};