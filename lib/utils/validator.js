var amanda = require('amanda');

function validate(schema, subject, cb) {
  amanda.validate(subject, schema, function(err) {
    if(!err)
      return cb();


    cb(Error.create(Error.VALIDATION, err[0].message));
  });
}

module.exports = validate;