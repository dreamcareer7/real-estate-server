var amanda = require('amanda');

function cast(subject, schema) {
  var properties = schema.properties;
  for(var property in properties) {
    if(properties[property].type !== 'number')
      continue;

    if(subject[property] === undefined || subject[property].lenth < 1)
      continue;

    var casted = parseFloat(subject[property]);
    if(!isNaN(casted))
      subject[property] = casted;
  }
}

function validate(schema, subject, cb) {
  cast(subject, schema);
  amanda.validate(subject, schema, function(err) {
    if(!err)
      return cb();


    cb(Error.create(Error.VALIDATION, err[0].message));
  });
}

module.exports = validate;