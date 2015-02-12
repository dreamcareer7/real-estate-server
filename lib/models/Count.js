var validator = require('../utils/validator.js');

Count = {};

var schema = {
  type: 'object',
  properties: {
    count: {
      type: 'integer',
      required: true,
    }
  }
}

var validate = validator.bind(null, schema);
