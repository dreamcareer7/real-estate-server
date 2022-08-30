const cheerio = require('cheerio')
const { expect } = require('chai')

const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const render_filters = require('../../../lib/utils/render/filters')

const BrandHelper = require('../brand/helper')

const sql = require('../../../lib/utils/sql')

const Email = require('../../../lib/models/Email/get')
const Orm = require('../../../lib/models/Orm/context')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Notification = require('../../../lib/models/Notification')
const User = require('../../../lib/models/User/get')
const Worker = require('../../../lib/models/CRM/Task/worker/notification')

let userA, userB, brand

async function setup() {
  userA = await User.getByEmail('test@rechat.com')
  userB = await User.getByEmail('test+email@rechat.com')

  brand = await BrandHelper.create({
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
  Orm.setPublicFields({ select: { email: ['html', 'text'] }, omit: {} })

  const ids = await sql.selectIds(`
    SELECT
      id
    FROM
      emails
  `)

  const emails = await Email.getAll(ids)
  
  if (emails.length === 0) {
    throw new Error('No emails found!')
  }

  return emails
}

async function expectEmailWithSubject(subject) {
  await Worker.sendEmailForUnread()
  await handleJobs()

  const emails = await getEmails()
  expect(emails).to.have.length(1)
  expect(emails[0].subject).to.equal(subject)

  return emails[0]
}

async function testAssignment() {
  Orm.setEnabledAssociations(['crm_task.assignees'])
  const task = await CrmTask.create(
    {
      created_by: userA.id,
      brand: brand.id,
      assignees: [userB.id],
      due_date: moment()
        .add(40, 'minutes')
        .unix(),
      title: 'Test assignment',
      task_type: 'Call',
      status: 'PENDING'
    }
  )

  await handleJobs()

  await Worker.sendNotifications()
  await handleJobs()

  const notifications = await getNotifications(userB.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('Assigned')
  expect(notifications[0].subject).to.equal(userA.id)

  const { html, subject } = await expectEmailWithSubject(userA.display_name)
  const $ = cheerio.load(html)

  expect(subject).to.be.equal(userA.display_name)
  expect($('#row1 th p:first-child').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal('You have been assigned to an event by ' + userA.display_name + '.')

  expect($('#row2 tbody:nth-child(1) p:nth-child(1)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal(`${task.task_type} | ${render_filters.time(task.due_date, 'MMM Do, YYYY, hh:mm A', userB.timezone)}`)
  expect($('#row2 tbody:nth-child(1) p:nth-child(2)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal(task.title)
  expect($('#row2 tbody:nth-child(1) p:nth-child(3)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal('')

  expect($('#row2 tbody:nth-child(2)').children()).to.have.length(0)
  expect($('#row2 tbody:nth-child(3)').children()).to.have.length(1)
  expect($('#row2 tbody:nth-child(3) th.menu-item')).to.have.length(1)
  expect($('#row2 tbody:nth-child(3) th.menu-item').text().trim()).to.be.equal(render_filters.initials(userB.display_name))
}

async function testUpdateAssignedTask() {
  Orm.setEnabledAssociations(['crm_task.assignees'])
  let task = await CrmTask.create(
    {
      created_by: userB.id,
      brand: brand.id,
      assignees: [userB.id],
      due_date: moment()
        .add(10, 'minutes')
        .unix(),
      title: 'Test assigned task update',
      task_type: 'Other',
      status: 'PENDING'
    }
  )

  await handleJobs()

  task = await CrmTask.update(
    task.id,
    {
      due_date: moment()
        .add(20, 'minutes')
        .unix(),
      title: 'Test assigned task update',
      task_type: 'Other',
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

  const { html, subject } = await expectEmailWithSubject('Updated Event')
  const $ = cheerio.load(html)

  expect(subject).to.be.equal('Updated Event')

  expect($('#row1 th p:first-child').text().trim()).to.be.equal(userA.display_name)
  expect($('#row1 th p:nth-child(2)').text().trim()).to.be.equal('updated an event.')
  expect($('#row1 th p:nth-child(3)').text().trim()).to.be.equal(`Updated on ${render_filters.time(task.updated_at, 'MMM Do, YYYY, hh:mm A', userB.timezone)}`)

  expect($('#row2 tbody:nth-child(1) p:nth-child(1)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal(`${task.task_type} | ${render_filters.time(task.due_date, 'MMM Do, YYYY, hh:mm A', userB.timezone)}`)
  expect($('#row2 tbody:nth-child(1) p:nth-child(2)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal(task.title)
  expect($('#row2 tbody:nth-child(1) p:nth-child(3)').text().trim().replace(/\s{2,}/g, ' ')).to.be.equal('')

  expect($('#row2 tbody:nth-child(2)').children()).to.have.length(0)
  expect($('#row2 tbody:nth-child(3)').children()).to.have.length(1)
  expect($('#row2 tbody:nth-child(3) th.menu-item')).to.have.length(1)
  expect($('#row2 tbody:nth-child(3) th.menu-item').text().trim()).to.be.equal(render_filters.initials(userB.display_name))
}

async function testTaskIsDue() {
  Orm.setEnabledAssociations(['crm_task.assignees'])
  const task = await CrmTask.create(
    {
      created_by: userA.id,
      brand: brand.id,
      assignees: [userA.id],
      due_date: moment()
        .add(1, 'second')
        .unix(),
      title: 'Test TaskIsDue',
      description: '<strong>Hello, </strong><i>World!</i>',
      task_type: 'Call',
      status: 'PENDING'
    }
  )

  const due_tasks = await Worker.getDueTasks()

  expect(due_tasks).not.to.be.empty
  expect(due_tasks[0].id).to.be.equal(task.id)

  await Worker.sendTaskDueNotifications()
  await handleJobs()

  const notifications = await getNotifications(userA.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('IsDue')

  const { html } = await expectEmailWithSubject('Upcoming Task')
  const $ = cheerio.load(html)

  expect($('#row2 th p:nth-child(1)').text().trim()).to.be.equal(task.title)
  expect(($('#row3 th').html() ?? '').trim()).to.be.equal(task.description)
}

async function testReminderIsDue() {
  Orm.setEnabledAssociations(['crm_task.assignees'])
  const task = await CrmTask.create(
    {
      created_by: userA.id,
      brand: brand.id,
      assignees: [userA.id],
      due_date: moment()
        .add(1, 'hour')
        .unix(),
      reminders: [{
        is_relative: false,
        timestamp: moment()
          .add(1, 'second')
          .unix()
      }],
      title: 'Test TaskIsDue',
      task_type: 'Call',
      status: 'PENDING'
    }
  )

  const due_tasks = await Worker.getDueReminders()

  expect(due_tasks).not.to.be.empty
  // expect(due_tasks[0].id).to.be.equal(task.id)

  await Worker.sendReminderNotifications()
  await handleJobs()

  const notifications = await getNotifications(userA.id)

  expect(notifications).to.have.length(1)
  expect(notifications[0].action).to.equal('IsDue')

  const { html } = await expectEmailWithSubject('Upcoming Task')
  const $ = cheerio.load(html)

  expect($('#row2 th p:nth-child(1)').text().trim()).to.be.equal(task.title)
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  describe('event notifications', () => {
    context('when user A assigns an event to user B', () => {
      it('should send user A a notification when a task is due', testTaskIsDue)
      it('should send user A a notification when a reminder is due', testReminderIsDue)
      it('should send user B a notification when user A assigns them to a task', testAssignment)
      it('should send user B a notification when user A updates a task assigned to them', testUpdateAssignedTask)
    })
  })
})
