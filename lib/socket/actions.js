Room.on('user added', (data) => {
  Socket.join(data.user, data.room.id)
  Socket.send('Room.UserJoined', data.room.id, [data.user, data.room])
})
