var sleep = require('sleep');

function authSlack(req, cb) {
  Admin.authToken(req.body.token, function(err, ok) {
    return cb(null, ok);
  });
}

function countListings(req, res) {
  Admin.totalListings('Any', function(err, total) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.end(total);
  });
}

function ping(req, res) {
  res.status(200);
  return res.end('pong');
}

function termUser(req, res) {
  Admin.terminateUser(req.params.id, function(err) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.end();
  });
}

function testHook(req, res) {
  console.log(req.body);
  console.log(req.method);

  return res.json({
    status: 'OK'
  });
}

var router = function(app) {
  app.post('/admin', countListings);
  app.post('/admin/test', testHook);
  app.get('/admin/ping', ping);
  app.delete('/admin/users/:id', termUser);
};

module.exports = router;
