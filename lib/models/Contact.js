var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');

Contact = {};

var schema = {
  type: 'object',
  properties: {
    user_id: {
      uuid: true,
      type: 'string',
      required: true
    },

    contact_id: {
      uuid: true,
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 30
    },

    last_name: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 30
    },

    email: {
      type: 'string',
      format: 'email',
      maxLength: 50,
      required: false
    },

    phone_number:  {
      type: 'string',
      minLength: 2,
      maxLength: 20
    }
  }
}

var validate = validator.bind(null, schema);

var get_by_user = "SELECT\
 COUNT(*) OVER() AS full_count,\
 'contact' AS type,\
 *\
 FROM contacts\
 WHERE\
 user_id = $1\
 ORDER BY created_at DESC\
 LIMIT $2\
 OFFSET $3";

Contact.getByUser = function(user_id, limit, offset, cb) {
  console.log(user_id, limit, offset);
  db.query(get_by_user, [user_id, limit, offset], function(err, res) {
    if(err)
      return cb(err);

    console.log(res.rows);
    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows);
  });
}

Contact.publicize = function(model) {
  delete model.full_count;

  return model;
}
