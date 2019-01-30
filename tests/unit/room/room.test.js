const { expect } = require('chai')

const { createContext } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const config = require('../../../lib/config')

const _createRoom = async () => {
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

const createRoom = async () => {
  const { base, created, user } = await _createRoom()

  expect(created.title).to.equal(base.title)
  expect(created.room_type).to.equal(base.room_type)
  expect(created.owner).to.equal(user.id)
}

const updateRoom = async () => {
  const { base, created } = await _createRoom()

  const title = 'Updated'

  const updated = await promisify(Room.update)(created.id, {
    ...base,
    title
  })

  expect(updated.title).to.equal(title)
}

const addUserConflict = async () => {
  const { created, user } = await _createRoom()

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
  const { created, user } = await _createRoom()

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
