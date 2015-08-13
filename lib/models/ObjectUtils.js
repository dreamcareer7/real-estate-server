var db = require('../utils/db.js');

ObjectUtils = {};

ObjectUtils.dereference = function(object, id, refs, cb) {
  if (global[object]) {
    if (global[object].getForUser) {
      return global[object].getForUser(id, refs.user, cb);
    } else if (global[object].getOnShortlist) {
      return global[object].getOnShortlist(id, refs.shortlist, cb);
    } else if (global[object].get) {
      return global[object].get(id, cb);
    } else {
      return cb();
    }
  } else {
    return cb();
  }
}

module.exports = function(){};