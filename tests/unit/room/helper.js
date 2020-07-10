const config = require('../../../lib/config')
const promisify = require('../../../lib/utils/promisify')
const User = require('../../../lib/models/User')
const Room = {
  ...require('../../../lib/models/Room/create'),
  ...require('../../../lib/models/Room/get'),
}

const create = async () => {
  const user = await User.getByEmail(config.tests.username)

  const base = {
    room_type: 'Group',
    title: 'Room Title',
    owner: user.id
  }

  const id = await Room.create(base)
  const created = await promisify(Room.get)(id)

  return { base, created, user }
}

module.exports = {
  create
}
