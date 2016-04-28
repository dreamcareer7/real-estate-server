var db = require('../utils/db.js');

ObjectUtil = {};

ObjectUtil.dereference = function(model, id, cb) {
  if (!global[model])
    return cb();

  if (model == 'Message')
    return cb(null, null);

  if (model == 'Room')
    return cb(null, null);

  if (!global[model].get)
    return cb();

  return global[model].get(id, cb);
};

ObjectUtil.getAssignees = function(model, id, cb) {
  if(!global[model])
    return cb([]);

  if(!global[model]['getAssignees'])
    return cb([]);

  return global[model].getAssignees(id, cb);
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

ObjectUtil.obfuscateString = function(string) {
  var start = parseInt(string.length / 4);
  var end = parseInt(string.length - (start));

  return string.substring(0, start) +
    Array(end - start + 1).join('x') +
    string.substring(end, string.length);
};

module.exports = function() {};
