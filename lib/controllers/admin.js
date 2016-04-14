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

function asyncFail(req, res) {
  setTimeout(() => {
    throw new Error('foo');
  })

  setTimeout(() => {
    throw new Error('foo');
  })

  setTimeout(() => {
    res.send('bar');
  })
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

function connections(req, res) {
  var room = SocketServer.io.sockets.adapter.rooms[req.params.room]
  if(!room)
    return res.json('Empty room');

  var data = Object.keys(room.sockets).map(socket_id => {
    var socket = SocketServer.io.sockets.connected[socket_id];
    return {
      user:socket.user ? socket.user.email : 'Guest',
      agent:socket.handshake.headers['user-agent']
    }
  })

  res.json(data)
}

var router = function(app) {
  app.post('/admin', countListings);
  app.post('/admin/test', testHook);
  app.get('/admin/ping', ping);
  app.get('/admin/async_fail', asyncFail);
  app.delete('/admin/users/:id', termUser);
  app.get('/admin/connections/:room', connections)
};

module.exports = router;
