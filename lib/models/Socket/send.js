const Context = require('../Context')
const { emit } = require('../../socket/attach')

const mock = (event, room, args, cb) => {
  if (cb)
    return cb()
}

const send = (event, room, args, cb) => {
  Context.log('Requesting Socket Event', event, 'to', room)
  emit(room, event, args)
  
  if (cb)
    return cb()
}

const isTest = process.env.NODE_ENV === 'tests'

module.exports = {
  send: isTest ? mock : send
}
