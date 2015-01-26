var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
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

    status: {
      type: 'string',
      required: true,
      enum: [ 'Unacknowledged', 'Favorited', 'Unfavorited' ]
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

// SQL queries to work with recommendation objects
var sql_get = require("../sql/recommendation/get.sql");
var sql_insert = require('../sql/recommendation/insert.sql');
var sql_get_shortlist = require('../sql/recommendation/get_shortlist.sql');
var sql_feed = require('../sql/recommendation/feed.sql');
var sql_pin = require('../sql/recommendation/pin.sql');
var sql_unpin = require('../sql/recommendation/unpin.sql');
var sql_feed_solo = require('../sql/recommendation/feed_solo.sql');
var sql_patch = require('../sql/recommendation/patch.sql');
var sql_favorites = require('../sql/recommendation/favorites.sql');
var sql_favorites_solo = require('../sql/recommendation/favorites_solo.sql');

function insert(recommendation, cb) {
  db.query(sql_insert, [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_user,
    recommendation.referring_savedsearch,
    recommendation.referring_shortlist,
    recommendation.object,
    recommendation.message_thread
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

function getFeedForUserOnShortlist(user_id, shortlist_id, limit, offset, cb) {
  db.query(sql_feed, [user_id, shortlist_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    var recommendation_ids = res.rows.map(function(r) {
                              return r.id;
                             });
    async.map(recommendation_ids,
              function(id, cb) {
                return Recommendation.getOnShortlist(id, shortlist_id, cb);
              },
              function(err, recommendations) {
                if (recommendations[0]) recommendations[0].full_count = res.rows[0].full_count;
                cb(null, recommendations);
              }
             );
  });
}

function getFeedForUser(user_id, limit, offset, cb) {
  db.query(sql_feed_solo, [user_id, limit, offset], function(err, res) {
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

function getFavoritesForUserOnShortlist(user_id, shortlist_id, limit, offset, cb) {
  db.query(sql_favorites, [user_id, shortlist_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    // if(res.rows.length < 1)
    //     return cb(null, false);

    var recommendation_ids = res.rows.map(function(r) {
                              return r.id;
                             });
    async.map(recommendation_ids,
              function(id, cb) { return Recommendation.getOnShortlist(id, shortlist_id, cb); },
              function(err, favorites) {
                if (res.rows[0]) favorites[0].full_count = res.rows[0].full_count
                cb(null, favorites);
              }
             );
  });
}

function getFavoritesForUser(user_id, limit, offset, cb) {
  db.query(sql_favorites_solo, [user_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    var favorites_incl = res.rows;
    async.map(favorites_incl, Recommendation.get, function(err, favorites) {
      favorites[0].full_count = res.rows[0].full_count;
      cb(null, favorites);
    });
  });
}

Recommendation.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
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

Recommendation.getOnShortlist = function(id, shortlist_id, cb) {
  db.query(sql_get_shortlist, [id, shortlist_id], function(err, res_base) {
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
      },
      favorited_by: function(cb) {
        if(!recommendation.favorited_by) {
          cb();
          return;
        }

        recommendation.favorited_by = recommendation.favorited_by.filter(Boolean);
        async.map(recommendation.favorited_by, User.get, cb);
      }
    }, function(err, results) {
         res_final = recommendation;
         res_final.referring_user = results.referring_user || {};
         res_final.referred_shortlist = results.referred_shortlist || {};
         res_final.listing = results.listing || {};
         res_final.favorited_by = results.favorited_by || {};

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

Recommendation.getFeedForUserOnShortlist = function(user_id, shortlist_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if (err)
        return cb(err);
      getFeedForUserOnShortlist(user_id, shortlist_id, limit, offset, cb);
    });
  });
}

Recommendation.getFeedForUser = function(user_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

      getFeedForUser(user_id, limit, offset, cb);
  });
}

// Also triggers favoriting this object
Recommendation.pin = function(recommendation_id, cb) {
  Recommendation.get(recommendation_id, function(err, recommendation) {
    if (err)
      return cb(err);

    db.query(sql_pin, [recommendation_id], function(err, res) {
      if (err)
        return cb(err);

      cb(null, false);
    });
  });
}

Recommendation.unpin = function(recommendation_id, cb) {
  db.query(sql_unpin, [recommendation_id], function(err, res) {
    if (err)
      return cb(err);

    cb(null, false);
  });
}

Recommendation.patchRecommendationForUserOnShortlist = function(recommendation_id, favorite, cb) {
  db.query(sql_patch, [recommendation_id, favorite], function(err, res) {
    if (err)
      return cb(err);

    cb(null, false);
  });
}

Recommendation.getFavoritesForUserOnShortlist = function(user_id, shortlist_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if (err)
        return cb(err);
      getFavoritesForUserOnShortlist(user_id, shortlist_id, limit, offset, cb);
    });
  });
}

Recommendation.getFavoritesForUser = function(user_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

      getFavoritesForUser(user_id, limit, offset, cb);
  });
}

Recommendation.publicize = function(model) {
  if (model.referring_user) User.publicize(model.referring_user);
  if (model.referred_shortlist) Shortlist.publicize(model.referred_shortlist);
  if (model.listing) Listing.publicize(model.listing);
  if (model.favorited_by) model.favorited_by.map(User.publicize);
  delete model.full_count;

  return model;
}

module.exports = function(){};