function authSlack(req, cb) {
  Admin.authToken(req.body.token, function(err, ok) {
    return cb(null, ok);
  });
}

function countListings(req, res) {
  console.log(req.body);
  Admin.totalListings('Any', function(err, total) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end(total);
  });
}

var router = function(app) {
  app.post('/admin', countListings);
}

module.exports = router;