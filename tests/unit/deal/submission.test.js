const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')

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


const set = async() => {
  const { task, user } = await createTask()

  const name = 'Submission Test'

  const form = await Form.create({
    name
  })

  const values = {
    f1: 'v1'
  }

  const submission = await Task.setSubmission(task.id, {
    form_id: form.id,
    user_id: user.id,
    state: Submission.FAIR,
    values,
  })

  expect(submission.state).to.equal(Submission.FAIR)
  expect(submission.author).to.equal(user.id)
  expect(submission.title).to.equal(name)
  expect(submission.revision_count).to.equal(1)

  const revision = await Form.getRevision(submission.last_revision)

  expect(revision.values).to.deep.equal(values)
  expect(revision.author).to.equal(user.id)

  return { submission, task, user }
}

const update = async() => {
  const { submission, task, user } = await set()

  const values = {
    f2: 'v2'
  }

  const updated = await Task.setSubmission(task.id, {
    ...submission,
    values,
    user_id: user.id
  })

  expect(updated.last_revision).not.to.equal(submission.last_revision)
  expect(updated.revision_count).to.equal(2)

  const revision = await Form.getRevision(updated.last_revision)

  expect(revision.values).to.deep.equal(values)
  expect(revision.author).to.equal(user.id)
}

describe('Deal Form', () => {
  createContext()

  it('set submission on a task', set)
  it('update submission on a task', update)
})
