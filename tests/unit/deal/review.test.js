const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const Activity = require('../../../lib/models/Activity')
const Context = require('../../../lib/models/Context')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const Message = require('../../../lib/models/Message/get')
const Room = require('../../../lib/models/Room/get')
const Task = require('../../../lib/models/Task')
const User = require('../../../lib/models/User/get')
const Review = require('../../../lib/models/Review')

const createTask = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    }
  })
  Context.set({ brand, user })

  const deal = await DealHelper.create(user.id, brand.id, {
    checklists: [{}]
  })

  const checklist = await DealChecklist.get(deal.checklists[0])

  const task = await Task.get(checklist.tasks[0])

  return { task, user }
}

const _add = async(props) => {
  const { task, user } = await createTask()

  const updated_task = await Task.setReview(task.id, {
    created_by: user.id,
    ...props
  })

  const review = await Review.get(updated_task.review)

  return {
    task: updated_task,
    review,
    user
  }
}

const add = async (props = {}) => {
  const status = Review.INCOMPLETE

  const { task, review, user } = await _add({
    status
  })

  expect(review.status).to.equal(status)

  const room = await promisify(Room.get)(task.room)
  expect(room.latest_activity).not.to.be.null

  const message = await promisify(Message.get)(room.latest_activity)
  const activity = await Activity.get(message.activity)

  expect(activity.object_class).to.equal('Review')
  expect(activity.object).to.equal(review.id)
  expect(activity.action).to.equal('UserUpdatedReview')

  return {
    review,
    task,
    user
  }
}

const update = async () => {
  const { task, user } = await add()

  const updated_task = await Task.setReview(task.id, {
    created_by: user.id,
    status: Review.SUBMITTED
  })

  const review = await Review.get(updated_task.review)

  expect(review.status).to.equal(Review.SUBMITTED)
}

const notification = async() => {
  await _add({
    status: Review.DECLINED
  })

  await Task.sendNotifications(-1)

  await handleJobs()
  /*
   * TODO: We need some assertions to make sure it's been sent.
   */
}

describe('Deal Review', () => {
  createContext()

  it('should set a review on a task', add)
  it('should update a review on a task', update)
  it('should set a review and send notifications', notification)
})
