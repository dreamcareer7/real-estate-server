var sleep = require('sleep');
var async = require('async');

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

  var collect = function(socket_id, cb) {
    var socket = SocketServer.io.sockets.connected[socket_id];
    if(!socket)
      return cb(null, {
        socket_id:socket_id,
        value:socket,
        message:'Socket not here!'
      })

    var data = {
      user:socket.user ? socket.user.email : 'Guest',
      agent:socket.handshake.headers['user-agent'],
    };

    var timedout = () => {
      data.ping_response = 'Timeout!';
      cb(null, data);
    }
    var timeout = setTimeout(timedout, 5000);

    socket.emit('ping', (err, response) => {
      clearTimeout(timeout);

      if(err)
        data.ping_response = err;
      else
        data.ping_response = response

      cb(null, data);
    })
  }

  async.map(Object.keys(room.sockets), collect, (err, connections) => {
    if(err)
      return res.error(err);

    res.json(connections)
  })
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
