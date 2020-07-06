const { expect } = require('chai')
const { createContext } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const Alert = require('../../../lib/models/Alert')
const AlertHelper = require('./helper')

const createAlert = async () => {
  const alert = await AlertHelper.create()

  return alert
}

const create = async () => {
  const { created, base } = await createAlert()
  expect(created).to.deep.include(base)
}

const get = async () => {
  const { created } = await createAlert()
  const alert = await promisify(Alert.get)(created.id)
  expect(alert.id).to.equal(created.id)
}

const getByRoom = async () => {
  const { created, room } = await createAlert()
  const [ found ] = await promisify(Alert.getForRoom)(room.id, {})
  expect(found.id).to.equal(created.id)
}

const getByUser = async () => {
  const { created, user } = await createAlert()
  const [ found ] = await promisify(Alert.getForUser)(user.id, {})

  expect(found.id).to.equal(created.id)
}

const search = async () => {
  const { created, user } = await createAlert()
  const [ found ] = await promisify(Alert.stringSearch)(user.id, [created.title])

  expect(found.id).to.equal(created.id)
}

const update = async () => {
  const { created, user, room } = await createAlert()

  const title = 'Updated Alert'

  const updated = await promisify(Alert.patch)(room.id, user.id, created.id, {
    title
  })

  expect(updated.title).to.equal(title)
}

const remove = async () => {
  const { created, user, room } = await createAlert()

  await promisify(Alert.delete)(created.id, user.id)

  const user_alerts = await promisify(Alert.getForUser)(user.id, {})
  expect(user_alerts).to.have.length(0)

  const room_alerts = await promisify(Alert.getForRoom)(room.id, {})
  expect(room_alerts).to.have.length(0)
}

describe('Alert', () => {
  createContext()

  it('create an alert', create)
  it('get an alert', get)
  it('delete an alert', remove)
  it('update an alert', update)
  it('get alerts by search', search)
  it('get alerts by room', getByRoom)
  it('get alerts by user', getByUser)
})
