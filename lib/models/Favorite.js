var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');

Favorite = {};

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

function parseSingleFavorite(favorite, cb) {
      async.parallel({
        referred_shortlist: function(cb) {
          if(!favorite.referred_shortlist) {
            cb();
            return;
          }

          Shortlist.get(favorite.referred_shortlist, cb);
        },
        listing: function(cb) {
          if(!favorite.object) {
            cb();
            return;
          }

          Listing.get(favorite.object, cb);
        }
    }, function(err, results) {
        async.map(favorite.favorited_by, User.get, function(err, favorited_by) {
          res_final = favorite;
          res_final.referred_shortlist = results.referred_shortlist || {};
          res_final.listing = results.listing || {};
          res_final.favorited_by = favorited_by;
          cb(null, res_final);
        })
       });
}

var get_allforuseronshortlist = "SELECT object AS id,\
 'favorite' AS type,\
 MAX(created_at) AS created_at, MAX(updated_at) AS updated_at,\
 JSON_AGG(referring_user) AS favorited_by,\
 object, recommendation_type, source, source_url,\
 referring_savedsearch, referred_shortlist\
 FROM recommendations\
 WHERE referred_shortlist = $1 AND favorited = TRUE\
 GROUP BY object, message_thread, recommendation_type,\
 source, source_url, referring_savedsearch, referred_shortlist\
 ORDER BY created_at DESC\
 LIMIT $2\
 OFFSET $3";
function getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, cb) {
  db.query(get_allforuseronshortlist, [shortlist_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    var favorites_incl = res.rows;
    async.map(favorites_incl, parseSingleFavorite, function(err, favorites) {
      favorites[0].full_count = favorites_incl.length;
      cb(null, favorites);
    });
  });
}

var get_allforuser = "SELECT object AS id,\
 'favorite' AS type,\
 MAX(created_at) AS created_at, MAX(updated_at) AS updated_at,\
 JSON_AGG(referring_user) AS favorited_by,\
 object, recommendation_type, source, source_url,\
 referring_savedsearch, referred_shortlist\
 FROM recommendations\
 WHERE referring_user = $1 AND favorited = TRUE\
 GROUP BY object, message_thread, recommendation_type,\
 source, source_url, referring_savedsearch, referred_shortlist\
 ORDER BY created_at DESC\
 LIMIT $2\
 OFFSET $3";
function getAllForUser(user_id, limit, offset, cb) {
  db.query(get_allforuser, [user_id, limit, offset], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
        return cb(null, false);

    var favorites_incl = res.rows;
    async.map(favorites_incl, parseSingleFavorite, function(err, favorites) {
      favorites[0].full_count = favorites_incl.length;
      cb(null, favorites);
    });
  });
}

Favorite.getAllForUserOnShortlist = function(user_id, shortlist_id, limit, offset, cb) {
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

Favorite.getAllForUser = function(user_id, limit, offset, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

      getAllForUser(user_id, limit, offset, cb);
  });
}

Favorite.publicize = function(model) {
  if (model.referred_shortlist) Shortlist.publicize(model.referred_shortlist);
  if (model.listing) Listing.publicize(model.listing);
  if (model.favorited_by) model.favorited_by.map(User.publicize)

  delete model.full_count;
  return model;
}

module.exports = function(){};