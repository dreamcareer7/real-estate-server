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
//
// Note on pagination:
// If a limit key is present in request body, that's being considered
// otherwise, a default number of 20 items will be returned.
function getFeedForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = parseInt(req.body.offset) || 0

  Recommendation.getFeedForUserOnShortlist(user_id, shortlist_id, limit, offset, function(err, recommendations) {
    if(err)
      return res.error(err);

    if(!recommendations) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(recommendations, offset, recommendations[0].full_count || 0);
  });
}

// Populates the feed response for user regardless of the shortlist
//
// This is obsolete and will be removed
function getFeedForUser(req, res) {
  var user_id = req.params.id;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = parseInt(req.body.offset) || 0

  Recommendation.getFeedForUser(user_id, limit, offset, function(err, recommendations) {
    if(err)
      return res.error(err);

    if(!recommendations) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(recommendations, offset, recommendations[0].full_count || 0);
  });
}

// Favorites a recommendation
function favoriteRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.body.recommendation_id;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.favorite(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return ;
  });
}

// Unfavorites a recommendation
function unfavoriteRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.body.recommendation_id;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;

  Recommendation.unfavorite(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return ;
  });
}

function patchRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.body.recommendation_id;
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var hidden = Boolean(req.body.hidden);

  Recommendation.patchRecommendationForUserOnShortlist(recommendation_id, hidden, function(err, recommendation) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return;
  });
}

function getFavoritesForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = parseInt(req.body.offset) || 0

  Recommendation.getFavoritesForUserOnShortlist(user_id, shortlist_id, limit, offset, function(err, favorites) {
    if(err)
      return res.error(err);

    if(!favorites) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(favorites, offset, favorites[0].full_count || 0);
  });
}

function getFavoritesForUser(req, res) {
  var user_id = req.params.id;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = parseInt(req.body.offset) || 0

  Favorite.getFavoritesForUser(user_id, limit, offset, function(err, favorites) {
    if(err)
      return res.error(err);

    if(!favorites) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(favorites, offset, favorites[0].full_count || 0);
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

  // Endpoint to favorite a recommendation for a user on a shortlist
  app.post('/shortlists/:sid/users/:id/recs/favorites', b(favoriteRecommendationForUserOnShortlist));

  // Endpoint to unfavorite a recommendation for a user on a shortlist
  app.delete('/shortlists/:sid/users/:id/recs/favorites', b(unfavoriteRecommendationForUserOnShortlist));

  // Endpoint to make a recommendation hidden/unhidden for a user on a shortlist
  app.patch('/shortlists/:sid/users/:id/recs/favorites', b(patchRecommendationForUserOnShortlist));

  // Endpoint to get favorites for a user on a shortlist
  app.get('/shortlists/:sid/users/:id/recs/favorites', b(getFavoritesForUserOnShortlist));

  // Endpoint to get favorites for a user (This is obsolete and will be removed)
  app.get('/users/:id/favorites', b(getFavoritesForUser));
}

module.exports = router;