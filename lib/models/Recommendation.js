var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');

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

    referred_shortlist: {
      type: 'string',
      required: true,
      uuid: true
    },

    favorited: {
      type: 'boolean',
      required: false
    },

    passed: {
      type: 'boolean',
      required: false
    },

    favorited_status: {
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
 referring_shortlist, favorited, passed, favorited_status, object, message_thread)\
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id';
function insert(recommendation, cb) {
  db.query(insert_sql, [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_user,
    recommendation.referring_savedsearch,
    recommendation.referring_shortlist,
    recommendation.favorited,
    recommendation.passed,
    recommendation.favorited_status,
    recommendation.object,
    recommendation.message_thread
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

var get_sql = "SELECT\
 'recommendation' AS type,\
 recommendations.*,\
 EXTRACT(EPOCH FROM created_at)::INT AS created_at,\
 EXTRACT(EPOCH FROM updated_at)::INT AS updated_at\
 FROM recommendations\
 WHERE id = $1";
Recommendation.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
        return cb(null, false);

    var recommendation = res_base.rows[0];

    async.parallel({
      referring_user: function(cb) {
        if (!recommendation.referring_user) {
          cb();
          return;
        }

        User.get(recommendation.referring_user, cb);
      },
      referred_shortlist: function(cb) {
        if(!recommendation.referred_shortlist) {
          cb();
          return;
        }

        Shortlist.get(recommendation.referred_shortlist, cb);
      },
      listing: function(cb) {
        if(!recommendation.object) {
          cb();
          return;
        }

        Listing.get(recommendation.object, cb);
      }
    }, function(err, results) {
         res_final = recommendation;
         res_final.referring_user = results.referring_user || {};
         res_final.referred_shortlist = results.referred_shortlist || {};
         res_final.listing = results.listing || {};
         cb(null, res_final);
       });
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

var get_allforuseronshortlist =
"SELECT\
 COUNT(*) OVER() AS full_count,\
 id\
 FROM recommendations\
 WHERE recommendations.referring_user = $1\
 AND recommendations.referred_shortlist = $2\
 AND recommendations.favorited = FALSE\
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

    var recommendation_ids = res.rows.map(function(r) {
                              return r.id;
                             });
    async.map(recommendation_ids, Recommendation.get, function(err, recommendations) {
      recommendations[0].full_count = res.rows[0].full_count;
      cb(null, recommendations);
    });
  });
}

var get_allforuser =
 "SELECT \
 COUNT(*) OVER() AS full_count,\
 id\
 FROM recommendations\
 WHERE recommendations.referring_user = $1\
 AND recommendations.favorited = FALSE\
 ORDER BY recommendations.created_at DESC\
 LIMIT $2\
 OFFSET $3";
function getAllForUser(user_id, limit, offset, cb) {
  db.query(get_allforuser, [user_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    var recommendation_ids = res.rows.map(function(r) {
                              return r.id;
                             });
    async.map(recommendation_ids, Recommendation.get, function(err, recommendations) {
      recommendations[0].full_count = res.rows[0].full_count;
      cb(null, recommendations);
    });
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

Recommendation.getAllForUser = function(user_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

      getAllForUser(user_id, limit, offset, cb);
  });
}

favorite_sql =
 "UPDATE\
 recommendations\
 SET favorited = TRUE\
 WHERE id = $1";
Recommendation.favorite = function(recommendation_id, cb) {
  Recommendation.get(recommendation_id, function(err, recommendation) {
    if (err)
      return cb(err);

    db.query(favorite_sql, [recommendation_id], function(err, res) {
      if (err)
        return cb(err);

      cb(null, false);
    });
  });
}

unfavorite_sql =
 "UPDATE\
 recommendations\
 SET favorited = FALSE\
 WHERE id = $1";
Recommendation.unfavorite = function(recommendation_id, cb) {
  Recommendation.get(recommendation_id, function(err, recommendation) {
    if (err)
      return cb(err);

    db.query(unfavorite_sql, [recommendation_id], function(err, res) {
      if (err)
        return cb(err);

      cb(null, false);
    });
  });
}

Recommendation.publicize = function(model) {
  if (model.referring_user) User.publicize(model.referring_user);
  if (model.referred_shortlist) Shortlist.publicize(model.referred_shortlist);
  if (model.listing) Listing.publicize(model.listing);

  delete model.full_count;
  return model;
}

module.exports = function(){};