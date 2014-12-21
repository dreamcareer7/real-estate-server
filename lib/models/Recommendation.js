var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Recommendation = {};

var schema = {
  type: 'object',
  properties: {
    recommendation_type: {
      type: 'string',
      required: true,
      enum: [ 'Listing', 'Agent', 'Bank', 'Card' ]
    },

    source: {
      type: 'string',
      required: true,
      enum: [ 'MLS', 'Zillow' ]
    },

    source_url: {
      type: 'string',
      required: false
    },

    referring_user: {
      type: 'string',
      required: true,
      uuid: true
    },

    referring_savedsearch: {
      type: 'string',
      required: false,
      uuid: true
    },

    referring_shortlist: {
      type: 'string',
      required: true,
      uuid: true
    },

    favourited: {
      type: 'boolean',
      required: false
    },

    passed: {
      type: 'boolean',
      required: false
    },

    favourited_status: {
      type: 'boolean',
      required: false
    },

    object: {
      type: 'string',
      uuid: true,
      required: true
    },

    message_thread: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO recommendations \
(recommendation_type, source, source_url, referring_user, referring_savedsearch,\
 referring_shortlist, favourited, passed, favourited_status, object, message_thread)\
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id';
function insert(recommendation, cb) {
  db.query(insert_sql, [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_user,
    recommendation.referring_savedsearch,
    recommendation.referring_shortlist,
    recommendation.favourited,
    recommendation.passed,
    recommendation.favourited_status,
    recommendation.object,
    recommendation.message_thread
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

var get_sql = "SELECT 'recommendation' AS type,\
 recommendations.*,\
 row_to_json(users.*) AS referring_user,\
 row_to_json(shortlists.*) AS referring_shortlist,\
 row_to_json(listings.*) AS listing\
 FROM recommendations\
 INNER JOIN users ON recommendations.referring_user = users.id\
 INNER JOIN shortlists ON recommendations.referring_shortlist = shortlists.id\
 INNER JOIN listings ON recommendations.object = listings.id\
 WHERE recommendations.id = $1";

Recommendation.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

Recommendation.create = function(recommendation, cb) {
  validate(recommendation, function(err) {
    if(err)
      return cb(err);

    User.get(recommendation.referring_user, function(err, user) {
      if (err)
        return cb(err);
      Shortlist.get(recommendation.referring_shortlist, function(err, shortlist) {
        if (err)
          return cb(err);
        Listing.get(recommendation.object, function(err, shortlist) {
          if (err)
            return cb(err);
          insert(recommendation, cb);
        });
      });
    });
  });
}

var get_allforuseronshortlist = "SELECT \
 COUNT(*) OVER() AS full_count,\
 'recommendation' AS type,\
 recommendations.*,\
 row_to_json(users.*, true) AS referring_user,\
 row_to_json(shortlists.*, true) AS referring_shortlist,\
 row_to_json(listings.*, true) AS listing\
 FROM recommendations\
 INNER JOIN users ON recommendations.referring_user = users.id\
 INNER JOIN shortlists ON recommendations.referring_shortlist = shortlists.id\
 INNER JOIN listings ON recommendations.object = listings.id\
 WHERE recommendations.referring_user = $1 AND recommendations.referring_shortlist = $2\
 ORDER BY recommendations.created_at DESC\
 LIMIT $3\
 OFFSET $4";

function getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, cb) {
  db.query(get_allforuseronshortlist, [user_id, shortlist_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows);
  });
}

Recommendation.getAllForUserOnShortlist = function(user_id, shortlist_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if (err)
        return cb(err);
      getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, cb);
    });
  });
}

Recommendation.publicize = function(model) {
  delete model.referring_user.password;
  delete model.full_count;
  return model;
}

module.exports = function(){};