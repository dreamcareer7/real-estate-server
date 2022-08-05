const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const Task = require('../../../lib/models/Task')
const User = require('../../../lib/models/User/get')
const Context = require('../../../lib/models/Context')


const createChecklist = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    }
  })
  Context.set({ brand })


  const deal = await DealHelper.create(user.id, brand.id, {
    checklists: [{}]
  })

  return DealChecklist.get(deal.checklists[0])
}

const add = async () => {
  const checklist = await createChecklist()

  const title = 'Test Task'
  const task_type = Task.GENERIC
  const order = 0
  const required = true

  const task = await Task.create({
    title,
    task_type,
    checklist: checklist.id,
    order,
    required
  })

  expect(task.id).to.be.a('string')
  expect(task.title).to.equal(title)
  expect(task.task_type).to.equal(task_type)
  expect(task.checklist).to.equal(checklist.id)
  expect(task.required).to.equal(required)

  return task
}

const get = async () => {
  const saved = await add()

  const task = await Task.get(saved.id)

  expect(task).to.deep.equal(saved)
}

const getAll = async () => {
  const saved = await add()

  const tasks = await Task.getAll([saved.id])

  expect(tasks[0]).to.deep.equal(saved)
}

const remove = async () => {
  const task = await add()
  await Task.delete(task.id)

  const deleted = await Task.get(task.id)
  expect(deleted.deleted_at).not.to.be.null

  const checklist = await DealChecklist.get(task.checklist)
  expect(checklist.tasks).not.to.include(deleted.id)
}

const removeAll = async () => {
  const task = await add()
  await Task.deleteAll([task.id])

  const deleted = await Task.get(task.id)
  expect(deleted.deleted_at).not.to.be.null

  const checklist = await DealChecklist.get(task.checklist)
  expect(checklist.tasks).not.to.include(deleted.id)
}

const update = async () => {
  const task = await add()

  const title = 'Updated Task'

  await Task.update({
    ...task,
    title,
    attention_requested: true
  })

  const updated = await Task.get(task.id)

  expect(updated.title).to.equal(title)
  expect(updated.attention_requested_at).not.to.be.null
}

const addUser = async () => {
  const task = await add()

  const user = await User.getByEmail('test@rechat.com')

  await Task.addUser({
    user,
    task_id: task.id
  })
}

describe('Deal Task', () => {
  createContext()

  it('should a add a task', add)
  it('should get a task', get)
  it('should get a batch of task', getAll)
  it('should delete a task', remove)
  it('should delete a batch of task', removeAll)
  it('should update a task', update)
  it('add user to a task', addUser)
})
