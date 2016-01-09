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

ObjectUtil.makeRegexps = function(strings) {
  return strings.map(function (r) {
    return '.*' + r + '.*';
  });
};

ObjectUtil.makeAllNumeric = function(value) {
  return value.replace(/\D/g, '');
};

ObjectUtil.trimLeadingZeros = function(value) {
  return value.replace(/^0*/g, '');
};

module.exports = function() {};
