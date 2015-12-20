var io;

function sendNotification(notification, info) {
  console.log('Got it');
  var send = function(user) {
    console.log('Sending', notification.object_class+'.'+notification.action, 'to', user.id);
    io.to(user.id).emit(notification.object_class+'.'+notification.action, notification)
  }

  info.users.forEach(send);
}
Notification.on('send', sendNotification);

module.exports = (socketio) => {
  io = socketio;
}