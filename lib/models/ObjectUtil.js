var db = require('../utils/db.js');

ObjectUtil = {};

ObjectUtil.dereference = function(object, id, cb) {
  if (global[object]) {
    if (object == 'Message')
      return cb(null, null);

    if (object == 'Room')
      return cb(null, null);

    if (global[object].get) {
      return global[object].get(id, cb);
    } else {
      return cb();
    }
  } else {
    return cb();
  }
}

module.exports = function() {};