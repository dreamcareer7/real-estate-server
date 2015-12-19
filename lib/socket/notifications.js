var io;

function sendNotification(notification, info) {
  var users = info.users;

  var send = function(user) {
    console.log('Sending to room', user);
    io.to(user.id).emit('notification', notification)
  }

  users.forEach(send);
}
Notification.on('send', sendNotification);

module.exports = (socketio) => {
  io = socketio;
}