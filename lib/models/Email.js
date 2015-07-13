var validator = require('../utils/validator.js');

Email = {};

var schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      required: true,
    }
  }
}

var validate = validator.bind(null, schema);
