Message.on('new message', (data) => {
  const cache = {}

  Orm.populate(data.room, cache, (err, room) => {
    Orm.populate(data.message, cache, (err, message) => {
      Socket.send('Message.Sent', data.room.id, [
        room,
        message
      ])
    })
  })
})

Room.on('user added', (data) => {
  Socket.join(data.user.id, data.room.id)
  Socket.send('Room.UserJoined', data.room.id, [data.user, data.room])
})
