function authSlack(req, cb) {
  Admin.authToken(req.body.token, function(err, ok) {
    return cb(null, ok);
  });
}

function countListings(req, res) {
  console.log(req.body);
  console.log(req.query.token);
  Admin.totalListings('Any', function(err, total) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end(total);
  });
}

function ping(req, res) {
  res.status(200);
  res.end('pong');
}

var router = function(app) {
  app.post('/admin', countListings);
  app.get('/admin/ping', ping);
}

module.exports = router;