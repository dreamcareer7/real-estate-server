var validator = require('../utils/validator.js');

Url = {};

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true,
    }
  }
}

var validate = validator.bind(null, schema);
