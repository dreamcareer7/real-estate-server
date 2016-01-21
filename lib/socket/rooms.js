var io = SocketServer.io;

function userAdded(data) {
  var sockets = io.sockets.adapter.rooms[data.user.id];
  if(!sockets)
    return ;

  Object.keys(sockets).map( socket_id => {
    var socket = io.sockets.connected[socket_id];
    if(!socket)
      return ;
    socket.join(data.room.id);
    socket.user.rooms.push(data.room);
  })
}
Room.on('user added', userAdded);
