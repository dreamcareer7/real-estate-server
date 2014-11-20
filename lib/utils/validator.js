var amanda = require('amanda')('json');

var uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

var uuidAttribute = function(property, propertyValue, attributeValue, propertyAttributes, callback) {
  if(!attributeValue)
    return callback();


  if(propertyValue.match(uuid_regex))
    return callback();

  this.addError('Not a valid UUID');

  return callback();
};

amanda.addAttribute('uuid', uuidAttribute);

function validate(schema, subject, cb) {
  amanda.validate(subject, schema, function(err) {
    if(!err)
      return cb();


    cb(Error.create(Error.VALIDATION, err[0].message));
  });
}

module.exports = validate;