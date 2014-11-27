var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Feed = {};

var schema = {
  type:'object',
  properties: {
    listing_id : {
      type:'string',
      required:true,
      uuid:true
    },

    user_id: {
      type:'string',
      required:true,
      uuid:true
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO feed (listing_id, user_id) VALUES ($1,$2)';

Feed.create = function(feed, cb) {
  validate(feed, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      feed.listing_id,
      feed.user_id,
    ], cb);
  });
}

module.exports = function(){};