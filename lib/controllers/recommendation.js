// Note on pagination:
// If a limit key is present in request body, that's being considered
// otherwise, a default number of 20 items will be returned.

// Creates a recommendation
//
// A Recommendation object as noted in data model with all required fields
// must be present as a JSON object in request body.
function createRecommendation(req, res) {
  var recommendation = req.body;

  Recommendation.create(recommendation, function(err, id) {
    if(err)
      return res.error(err);

    Recommendation.get(id, function(err, recommendation) {
      if(err)
        return res.error(err);

        res.status(201);
        res.model(recommendation);
    });
  });
}

// Returns a recommendation object
//
// Usually this method is called only in our internals.
function getRecommendation(req, res) {
  Recommendation.get(req.params.id, function(err, recommendation) {
    if(err)
      return res.error(err);

    if(!recommendation) {
      res.status(404);
      res.end();
      return ;
    }

    res.model(recommendation);
  });
}

// Populates the feed response for user
function getFeedForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var paging = {};
  req.pagination(paging);

  Recommendation.getFeedForUserOnShortlist(user_id, shortlist_id, paging, function(err, recommendations) {
    if(err)
      return res.error(err);

    res.collection(recommendations);
  });
}

// Populates the active recommendations response for user
function getActivesForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.getActivesForUserOnShortlist(user_id, shortlist_id, function(err, recommendations) {
    if(err)
      return res.error(err);

    res.collection(recommendations);
  });
}

// Populates the already seen recommendations response for user
function getSeenForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var paging = {};
  req.pagination(paging);

  Recommendation.getSeenForUserOnShortlist(user_id, shortlist_id, paging, function(err, recommendations) {
    if(err)
      return res.error(err);

    res.collection(recommendations);
  });
}

// Return feed collection size for user on shortlist
function getFeedCountForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.getFeedCountForUserOnShortlist(user_id, shortlist_id, function(err, count) {
    if(err)
      return res.error(err);

    res.model(count);
  });
}

// Populates the feed response for user regardless of the shortlist
//
// This is obsolete and will be removed
function getFeedForUser(req, res) {
  var user_id = req.params.id;
  var paging = {};

  req.pagination(paging);
  Recommendation.getFeedForUser(user_id, paging, function(err, recommendations) {
    if(err)
      return res.error(err);

    if(!recommendations) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(recommendations);
  });
}

// Pins a recommendation for a user on a shortlist
function pinRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.body.recommendation_id;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.pin(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    Recommendation.getOnShortlist(recommendation_id, shortlist_id, function(err, recommendation) {
      if(err)
        return res.error(err);

      res.model(recommendation);
    });
  });
}

// Unpins a recommendation for a user on a shortlist
function unpinRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.params.rid;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.unpin(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    Recommendation.getOnShortlist(recommendation_id, shortlist_id, function(err, recommendation) {
      if(err)
        return res.error(err);

      res.model(recommendation);
    });
  });
}

// Unpins a recommendation for a user on a shortlist
function markRecommendationAsReadForUserOnShortlist(req, res) {
  var recommendation_id = req.params.rid;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.markAsRead(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    Recommendation.getOnShortlist(recommendation_id, shortlist_id, function(err, recommendation) {
      if(err)
        return res.error(err);

      res.model(recommendation);
    });
  });
}

function patchFavoriteForUserOnShortlist(req, res) {
  var recommendation_id = req.params.rid;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var favorite = Boolean(req.body.favorite);

  Recommendation.patch(recommendation_id, favorite, function(err, recommendation) {
    if(err)
      return res.error(err);

    Recommendation.getOnShortlist(recommendation_id, shortlist_id, function(err, recommendation) {
      if(err)
        return res.error(err);

      res.model(recommendation);
    });
  });
}

function patchTourForUserOnShortlist(req, res) {
  var recommendation_id = req.params.rid;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var tour = Boolean(req.body.tour);

  Recommendation.patchTour(recommendation_id, tour, function(err, recommendation) {
    if(err)
      return res.error(err);

    Recommendation.getOnShortlist(recommendation_id, shortlist_id, function(err, recommendation) {
      if(err)
        return res.error(err);

      res.model(recommendation);
    });
  });
}

function getFavoritesForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var paging = {};

  req.pagination(paging);
  Recommendation.getFavoritesForUserOnShortlist(user_id, shortlist_id, paging, function(err, favorites) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(favorites);
  });
}

function getToursForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var paging = {};

  req.pagination(paging);
  Recommendation.getToursForUserOnShortlist(user_id, shortlist_id, paging, function(err, tours) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(tours);
  });
}

// Return favorites collection size for user on shortlist
function getFavoritesCountForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.getFavoritesCountForUserOnShortlist(user_id, shortlist_id, function(err, count) {
    if(err)
      return res.error(err);

    res.model(count);
  });
}

function getFavoritesForUser(req, res) {
  var user_id = req.params.id;
  var paging = {};

  req.pagination(paging);
  Favorite.getFavoritesForUser(user_id, paging, function(err, favorites) {
    if(err)
      return res.error(err);

    if(!favorites) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(favorites);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // Endpoint to create a recommendation
  app.post('/recs', b(createRecommendation));

  // Endpoint to get a recommendation
  app.get('/recs/:id', b(getRecommendation));

  // Endpoint to get the feed for a user (This is obsolete and will be removed)
  app.get('/users/:id/recs/feed', b(getFeedForUser));

  // Endpoint to get the feed for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/feed', b(getFeedForUserOnShortlist));

  // Endpoint to get the active recommendations for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/actives', b(getActivesForUserOnShortlist));

  // Endpoint to get the already seen recommendations for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/seen', b(getSeenForUserOnShortlist));

  // Endpoint to get the feed count for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/feed/count', b(getFeedCountForUserOnShortlist));

  // Endpoint to Pin a recommendation for a user on a shortlist that also triggers a favorite
  app.post('/shortlists/:sid/users/:id/recs/favorites', b(pinRecommendationForUserOnShortlist));

  // Endpoint to Unpin a recommendation for a user on a shortlist
  app.delete('/shortlists/:sid/users/:id/recs/feed/:rid', b(markRecommendationAsReadForUserOnShortlist));

  // Endpoint to make favorite/unfavorite a recommendation for a user on a shortlist
  app.patch('/shortlists/:sid/users/:id/recs/favorites/:rid', b(patchFavoriteForUserOnShortlist));

  // Endpoint to make tour/untour a recommendation for a user on a shortlist
  app.patch('/shortlists/:sid/users/:id/recs/tours/:rid', b(patchTourForUserOnShortlist));

  // Endpoint to get favorites for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/favorites', b(getFavoritesForUserOnShortlist));

  // Endpoint to get tours for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/tours', b(getToursForUserOnShortlist));

  // Endpoint to get favorites for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/favorites/count', b(getFavoritesCountForUserOnShortlist));

  // Endpoint to get favorites for a user (This is obsolete and will be removed)
  app.get('/users/:id/favorites', b(getFavoritesForUser));
}

module.exports = router;