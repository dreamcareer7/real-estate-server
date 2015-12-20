var io;

function sendNotification(notification, info) {

  var send = function(user) {
    io.to(user.id).emit(notification.object_class+'.'+notification.action, notification)
  }

  info.users.forEach(send);
}
Notification.on('send', sendNotification);

module.exports = (socketio) => {
  io = socketio;
}