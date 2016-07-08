var amanda = require('amanda')('json');
var pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var date_regex = /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/i;

var uuidAttribute = function(property, propertyValue, attributeValue, propertyAttributes, callback) {
  if(!attributeValue)
    return callback();

  if(!propertyValue)
    return callback();

  if(propertyValue && propertyValue.match(uuid_regex))
    return callback();

  this.addError('Not a valid UUID');

  return callback();
};

var dateAttribute = function(property, propertyValue, attributeValue, propertyAttributes, callback) {
  if(!attributeValue)
    return callback();


  if(propertyValue && propertyValue.match(date_regex))
    return callback();

  this.addError('Not a valid Date');

  return callback();
};

var phoneAttribute = function(property, propertyValue, attributeValue, propertyAttributes, callback) {
  if(!attributeValue)
    return callback();

  if(!propertyValue)
    return callback();

  if(propertyValue && pnu.isPossibleNumberString(propertyValue))
    return callback();

  this.addError('Not a valid Phone Number');

  return callback();
};

amanda.addAttribute('uuid', uuidAttribute);
amanda.addAttribute('date', dateAttribute);
amanda.addAttribute('phone', phoneAttribute);

function validate(schema, subject, cb) {
  amanda.validate(subject, schema, function(errors) {
    if(!errors)
      return cb();

    var details = {
      message: 'Validation Error',
      attributes: {}
    };

    for(var i=0; i<errors.length; i++) {
      var err = errors[i];
      var property = err.property[0];

      if(!details.attributes[property])
        details.attributes[property] = [];

      details.attributes[property].push(err.message);
    }

    return cb(Error.create(Error.VALIDATION, details));
  });
}

module.exports = validate;
