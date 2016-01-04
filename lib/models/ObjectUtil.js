var db = require('../utils/db.js');

ObjectUtil = {};

ObjectUtil.dereference = function(object, id, cb) {
  if (!global[object])
    return cb();

  if (object == 'Message')
    return cb(null, null);

  if (object == 'Room')
    return cb(null, null);

  if (!global[object].get)
    return cb();

  global[object].get(id, cb);
};

ObjectUtil.cleanPhoneNumber = function(number) {
  return number.replace(/[|&;$%@"<>(),\ ]/g, '');
};

ObjectUtil.queryStringArray = function(argument) {
  return (argument) ? argument.split(',').map(function(r) { return r.trim(); }) : [];
};

module.exports = function() {};
