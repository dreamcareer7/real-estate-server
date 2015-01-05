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

// function updateRecommendation(req, res) {
//   Recommendation.get(req.params.id, function(err, recommendation) {
//     if(err)
//       return res.error(err);

//     if(!recommendation) {
//       res.status(404);
//       res.end();
//       return ;
//     }

//     var data = req.body;

//     Recommendation.update(recommendation.id, data, function(err) {
//       if(err)
//         return res.error(err);

//       res.status(200);
//       res.end();
//     });
//   });
// }


function getRecommendationsForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = req.body.offset || 0

  Recommendation.getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, function(err, recommendations) {
    if(err)
      return res.error(err);

    if(!recommendations) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(recommendations, offset, recommendations[0].full_count || 0);
  });
}

function favoriteRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.params.id;

  Recommendation.favorite(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return ;
  });
}

function unfavoriteRecommendationForUserOnShortlist(req, res) {
  var recommendation_id = req.params.id;

  Recommendation.unfavorite(recommendation_id, function(err, recommendation) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return ;
  });
}

// function addRecommendationUsers(req, res) {
//   user_id = req.body.user_id;
//   Recommendation.addUser(user_id, req.params.id, function(err, recommendation) {
//     if (err)
//       return res.error(err);

//     res.success('success');
//   });
// }

// function deleteRecommendation(req, res) {
//   Recommendation.get(req.params.id, function(err, recommendation) {
//     if(err)
//       return res.error(err);

//     if(!recommendation) {
//       res.status(404);
//       res.end();
//       return ;
//     }

//     Recommendation.delete(recommendation.id, function(err) {
//       if(err)
//         return res.error(err);

//       res.status(204);
//       res.end();
//     });
//   });
// }


var router = function(app) {
  var b = app.auth.bearer;

  app.post('/recommendations', b(createRecommendation));
  app.get('/recommendations/:id', b(getRecommendation));
  app.get('/users/:id/shortlists/:sid/recs/feed', b(getRecommendationsForUserOnShortlist));

  app.post('/recommendations/:id/favorite', b(favoriteRecommendationForUserOnShortlist));
  app.post('/recommendations/:id/unfavorite', b(unfavoriteRecommendationForUserOnShortlist));
  // app.put('/recommendation/:id', b(updateRecommendation));
  // app.delete('/recommendation/:id', b(deleteRecommendation));
  // app.put('/recommendation/:id/users', b(addRecommendationUsers));
}

module.exports = router;