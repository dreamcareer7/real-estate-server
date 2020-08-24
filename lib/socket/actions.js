const Context = require('../models/Context')
const Socket = require('../models/Socket')
const Emitter = require('../utils/event_emitter')

if (process.env.NODE_ENV !== 'tests') {
  Emitter.on('Room:user added', data => {
    Context.log('User added to room')

    Socket.join(data.user, data.room.id)
    Socket.send('Room.UserJoined', data.room.id, [data.user, data.room])
  })
}
