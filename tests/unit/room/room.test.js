const { expect } = require('chai')
const { createContext } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const RoomHelper = require('./helper')
const Room = {
  ...require('../../../lib/models/Room/update'),
  ...require('../../../lib/models/Room/users/get'),
  ...require('../../../lib/models/Room/users/add'),
}

const createRoom = async () => {
  const { base, created, user } = await RoomHelper.create()

  expect(created.title).to.equal(base.title)
  expect(created.room_type).to.equal(base.room_type)
  expect(created.owner).to.equal(user.id)
}

const updateRoom = async () => {
  const { base, created } = await RoomHelper.create()

  const title = 'Updated'

  const updated = await promisify(Room.update)(created.id, {
    ...base,
    title
  })

  expect(updated.title).to.equal(title)
}

const addUserConflict = async () => {
  const { created, user } = await RoomHelper.create()

  try {
    await promisify(Room.addUser)({
      room_id: created.id,
      user_id: user.id
    })
  } catch(e) {
    expect(e.code).to.equal('Conflict')
  }
}

const getUserRooms = async () => {
  const { created, user } = await RoomHelper.create()

  const rooms = await Room.getUserRoomIds(user.id)
  expect(rooms).to.include(created.id)
}

describe('Room', () => {
  createContext()

  it('should successfully create a room', createRoom)
  it('should update a room', updateRoom)
  it('should fail adding a duplicate user', addUserConflict)
  it('should get rooms of a user', getUserRooms)
})
