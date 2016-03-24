Message.on('new message', (data) => {
  Socket.send('Message.Sent', data.room.id, [
    Room.publicize(data.room),
    Message.publicize(data.message)
  ])
})

Room.on('user added', (data) => {
  Socket.join(data.user.id, data.room.id)
});