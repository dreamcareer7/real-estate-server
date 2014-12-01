var amanda = require('amanda')('json');

var uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

var uuidAttribute = function(property, propertyValue, attributeValue, propertyAttributes, callback) {
  if(!attributeValue)
    return callback();


  if(propertyValue && propertyValue.match(uuid_regex))
    return callback();

  this.addError('Not a valid UUID');

  return callback();
};

amanda.addAttribute('uuid', uuidAttribute);

function validate(schema, subject, cb) {
  amanda.validate(subject, schema, function(errors) {
    if(!errors)
      return cb();


    var details = {
      message:'Validation Error',
      attributes:{}
    }

    for(var i=0; i<errors.length; i++) {
      var err = errors[i];
      var property = err.property[0];
      
      if(!details.attributes[property])
        details.attributes[property] = [];

      details.attributes[property].push(err.message);


    }

    cb(Error.create(Error.VALIDATION, details));
  });
}

module.exports = validate;