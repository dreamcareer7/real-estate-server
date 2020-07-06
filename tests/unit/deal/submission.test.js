const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const Task = require('../../../lib/models/Task')
const Form = require('../../../lib/models/Form')
const Submission = require('../../../lib/models/Form/submission')
const User = require('../../../lib/models/User')
const Context = require('../../../lib/models/Context')

const {
  updateTaskSubmission
} = require('../../../lib/models/Deal/form')

const seller = {
  role: 'Seller',
  legal_first_name: 'Dan',
  legal_last_name: 'Hogan'
}

const full_address = '12345 Munger Avenue, Dallas, TX'

const createTask = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create()
  Context.set({ brand, user })

  const deal = await DealHelper.create(user.id, brand.id, {
    checklists: [{
      context: {
        full_address: {
          value: full_address
        }
      }
    }],
    roles: [
      seller
    ]
  })

  const checklist = await DealChecklist.get(deal.checklists[0])

  const task = await Task.get(checklist.tasks[0])

  return { task, user, deal }
}


const set = async() => {
  const { task, user, deal } = await createTask()

  const values = {
    f1: 'v1'
  }

  const submission = await Task.setSubmission(task.id, {
    user_id: user.id,
    state: Submission.FAIR,
    values,
  })

  const form = await Form.get(task.form)

  expect(submission.title).to.equal(form.name)
  expect(submission.state).to.equal(Submission.FAIR)
  expect(submission.author).to.equal(user.id)
  expect(submission.revision_count).to.equal(1)

  const revision = await Submission.getRevision(submission.last_revision)

  expect(revision.values).to.deep.equal(values)
  expect(revision.author).to.equal(user.id)

  return { submission, task, user, deal }
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

  const revision = await Submission.getRevision(updated.last_revision)

  expect(revision.values).to.deep.equal(values)
  expect(revision.author).to.equal(user.id)
}

const generatePdf = async() => {
  const { task, user, deal } = await set()

  const updated = await updateTaskSubmission({
    task,
    user,
    deal
  })

  const { values } = await Submission.getRevision(updated.last_revision)

  /*
   * The Mock PDF File is a copy of 1-4 Family Contract
   */

  expect(values['Form1']).to.equal(`${seller.legal_first_name} ${seller.legal_last_name}`)
  expect(values['Form8']).to.equal(full_address)
}

describe('Deal Form', () => {
  createContext()

  it('set submission on a task', set)
  it('update submission on a task', update)
  it('generate pdf for a task', generatePdf)
})
