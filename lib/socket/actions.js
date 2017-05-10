Message.on('new message', async data => {
  const [room, message] = await Orm.populate({
    models: [
      data.room,
      data.message
    ]
  })

  Socket.send('Message.Sent', data.room.id, [
    room,
    message
  ])
})

Room.on('user added', (data) => {
  Socket.join(data.user.id, data.room.id)
  Socket.send('Room.UserJoined', data.room.id, [data.user, data.room])
})
