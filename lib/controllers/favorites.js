function getFavoritesForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = req.body.offset || 0

  Favorite.getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, function(err, favorites) {
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

  app.get('/users/:id/shortlists/:sid/recs/favorites', b(getFavoritesForUserOnShortlist));
}

module.exports = router;