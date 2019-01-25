const { expect } = require('chai')

const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')

const { createBrand } = require('../brand/helper')

const sql = require('../../../lib/models/SupportBot/sql')

const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Notification = require('../../../lib/models/Notification')
const User = require('../../../lib/models/User')
const Worker = require('../../../lib/models/CRM/Task/worker')

let userA, userB, brand

async function setup() {
  userA = await promisify(User.getByEmail)('test@rechat.com')
  userB = await promisify(User.getByEmail)('test+email@rechat.com')

  brand = await createBrand({
    roles: {
      Admin: [userA.id, userB.id]
    }
  })

  Context.set({ user: userA, brand })
}

async function getNotifications(user_id) {
  return promisify(Notification.getForUser)(user_id, {})
}

async function getEmails() {
  return sql.select(`
    SELECT
      *
    FROM
      emails
  `)
}

async function expectEmailWithSubject(subject) {
  await Worker.sendEmailForUnread()
  await handleJobs()

  const emails = await getEmails()
  expect(emails).to.have.length(1)
  expect(emails[0].subject).to.equal(subject)
}

async function testAssignment() {
  await CrmTask.create(
    {
      assignees: [userB.id],
      due_date: moment()
        .add(40, 'minutes')
        .unix(),
      title: 'Test assignment',
      task_type: 'Call',
      status: 'PENDING'
    },
    userA.id,
    brand.id
  )

  await handleJobs()

  await Worker.sendNotifications()
  await handleJobs()

  const notifications = await getNotifications(userB.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('Assigned')
  expect(notifications[0].subject).to.equal(userA.id)

  await expectEmailWithSubject(userA.display_name)
}

async function testUpdateAssignedTask() {
  const task = await CrmTask.create(
    {
      assignees: [userB.id],
      due_date: moment()
        .add(10, 'minutes')
        .unix(),
      title: 'Test assigned task update',
      task_type: 'Call',
      status: 'PENDING'
    },
    userB.id,
    brand.id
  )

  await handleJobs()

  await CrmTask.update(
    task.id,
    {
      due_date: moment()
        .add(20, 'minutes')
        .unix(),
      title: 'Test assigned task update',
      task_type: 'Call',
      status: 'PENDING'
    },
    userA.id
  )

  await handleJobs()

  await Worker.sendNotifications()
  await handleJobs()

  const notifications = await getNotifications(userB.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('Edited')

  await expectEmailWithSubject('Updated Event')
}

async function testTaskIsDue() {
  const task = await CrmTask.create(
    {
      assignees: [userA.id],
      due_date: moment()
        .add(1, 'second')
        .unix(),
      title: 'Test TaskIsDue',
      task_type: 'Call',
      status: 'PENDING'
    },
    userA.id,
    brand.id
  )

  const due_tasks = await Worker.getDueTasks()

  expect(due_tasks).not.to.be.empty
  expect(due_tasks[0].id).to.be.equal(task.id)

  await Worker.sendTaskDueNotifications()
  await handleJobs()

  const notifications = await getNotifications(userA.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('IsDue')

  await expectEmailWithSubject('Upcoming Rechat Event')
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  describe('event notifications', () => {
    context('when user A assigns an event to user B', () => {
      it('should send user A a notification when a task is due', testTaskIsDue)
      it(
        'should send user B a notification when user A assigns them to a task',
        testAssignment
      )
      it(
        'should send user B a notification when user A updates a task assigned to them',
        testUpdateAssignedTask
      )
    })
  })
})
