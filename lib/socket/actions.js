if (process.env.NODE_ENV !== 'tests') {
  Room.on('user added', data => {
    Context.log('User added to room')

    Socket.join(data.user, data.room.id)
    Socket.send('Room.UserJoined', data.room.id, [data.user, data.room])
  })
}
