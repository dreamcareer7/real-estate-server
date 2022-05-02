const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const Task = require('../../../lib/models/Task')
const Form = require('../../../lib/models/Form')
const Submission = require('../../../lib/models/Form/submission')
const User = require('../../../lib/models/User/get')
const Context = require('../../../lib/models/Context')

const {
  updateTaskSubmission
} = require('../../../lib/models/Deal/form')

const seller1 = {
  role: 'Seller',
  legal_first_name: 'Dan',
  legal_last_name: 'Hogan'
}

const seller2  = {
  role: 'Seller',
  legal_first_name: 'Kevin',
  legal_last_name: 'Smith'
}

const full_address = '12345 Munger Avenue, Dallas, TX'

const createTask = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    }
  })
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
      seller1,
      seller2
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
   * The Mock PDF File is a copy of Residential Listing Agreement (TAR 1101)
   */

  // This is a Roles field. Should list all Seller Names
  expect(values['Form1']).to.equal(`${seller1.legal_first_name} ${seller1.legal_last_name}, ${seller2.legal_first_name} ${seller2.legal_last_name}`)

  // This is a Role field. Should be first Seller's name
  expect(values['Form163']).to.equal(`${seller1.legal_first_name} ${seller1.legal_last_name}`)

  // This is a Role field. Should be second Seller's name
  expect(values['Form167']).to.equal(`${seller2.legal_first_name} ${seller2.legal_last_name}`)

  // Context field.
  expect(values['Form33']).to.equal(full_address)
}

describe('Deal Form', () => {
  createContext()

  it('set submission on a task', set)
  it('update submission on a task', update)
  it('generate pdf for a task', generatePdf)
})
