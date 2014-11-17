var validator = require('../utils/validator.js');
var db = require('../utils/db.js');

Address = {};

var schema = {
  type:'object',
  properties: {
    type:{
      type:'string',
      required:true
    },

    title:{
      type:'string',
      required:true
    },

    subtitle:{
      type:'string',
      required:true
    }
  }
}

Address.validate = validator.bind(null, schema);

module.exports = function(){};