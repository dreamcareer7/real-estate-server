function getFavouritesForUserOnShortlist(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = req.body.offset || 0

  Favourite.getAllForUserOnShortlist(user_id, shortlist_id, limit, offset, function(err, favourites) {
    if(err)
      return res.error(err);

    if(!favourites) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(favourites, offset, favourites[0].full_count || 0);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/users/:id/shortlists/:sid/recs/favourites', b(getFavouritesForUserOnShortlist));
}

module.exports = router;