var orm = require('../utils/orm');

Message.on('new message', (data) => {
  var cache = {};

  orm.populate(data.room, cache, (err, room) => {
    orm.populate(data.message, cache, (err, message) => {
      Socket.send('Message.Sent', data.room.id, [
        room,
        message
      ])
    })
  })
})

Room.on('user added', (data) => {
  Socket.join(data.user.id, data.room.id)
  Socket.send('Room.UserJoined', data.room.id, [data.user])
});