var io;

function sendNotification(notification, info) {
  var users = info.users;

  var send = function(user) {
    io.to(user.id).emit(notification.object_class+'.'+notification.action, notification)
  }

  users.forEach(send);
}
Notification.on('send', sendNotification);

module.exports = (socketio) => {
  io = socketio;
}