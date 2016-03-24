Message.on('new message', (data) => {
  Socket.send('Message.Sent', data.room.id, [data.room, data.message])
})

Room.on('user added', (data) => {
  console.log('User Added to room');
  Socket.join(data.user.id, data.room.id)
});