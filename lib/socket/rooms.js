var io;

function userAdded(data) {
  io.to(data.user.id).emit('joined room', Room.publicize(data.room))

  var sockets = io.sockets.adapter.rooms[data.user.id];
  if(!sockets)
    return ;

  Object.keys(sockets).map( socket_id => {
    var socket = io.sockets.connected[socket_id];
    socket.join(data.room.id);
  })
}
Room.on('user added', userAdded);

module.exports = (socketio) => {
  io = socketio;
}