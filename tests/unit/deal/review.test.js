const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const createTask = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create()
  Context.set({ brand, user })

  const deal = await DealHelper.create(user.id, brand.id, {
    checklists: [{}]
  })

  const checklist = await DealChecklist.get(deal.checklists[0])

  const task = await Task.get(checklist.tasks[0])

  return { task, user }
}

const add = async () => {
  const { task, user } = await createTask()

  const status = Review.INCOMPLETE
  const created_by = user.id

  const updated_task = await Task.setReview(task.id, {
    status,
    created_by
  })

  const saved = await Review.get(updated_task.review)
  expect(saved.status).to.equal(status)

  const room = await promisify(Room.get)(task.room)
  expect(room.latest_activity).not.to.be.null

  const message = await promisify(Message.get)(room.latest_activity)
  const activity = await promisify(Activity.get)(message.activity)

  expect(activity.object_class).to.equal('Review')
  expect(activity.object).to.equal(saved.id)
  expect(activity.action).to.equal('UserUpdatedReview')

  return {
    review: saved,
    task: updated_task,
    user
  }
}

const update = async () => {
  const { task, user } = await add()

  const updated_task = await Task.setReview(task.id, {
    created_by: user.id,
    status: Review.SUBMITTED
  })

  const updated = await Review.get(updated_task.review)

  expect(updated.status).to.equal(Review.SUBMITTED)
}

describe('Deal Review', () => {
  createContext()

  it('should set a review on a task', add)
  it('should update a review on a task', update)
})
