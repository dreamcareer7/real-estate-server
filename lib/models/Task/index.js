const promisify = require('../../utils/promisify')
const db = require('../../utils/db')
const validator = require('../../utils/validator')
const redis = require('../../data-service/redis').createClient()

const config = require('../../config')
const _ = require('lodash')

const Orm = require('../Orm')

const Task = {}
global['Task'] = Task

Orm.register('task', 'Task', Task)

const schema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: true
    },

    task_type: {
      type: 'string',
      required: true,
      enum: [ 'Generic', 'Form' ]
    }
  }
}

const validate = promisify(validator.bind(null, schema))

Task.get = async id => {
  const tasks = await Task.getAll([id])

  if (tasks.length < 1)
    throw Error.ResourceNotFound(`Task ${id} not found`)

  return tasks[0]
}

Task.getAll = async ids => {
  const res = await db.query.promise('task/get', [ids])

  return res.rows
}

Task.delete = async id => {
  const tasks = await Task.getAll([id])
  
  if (tasks.length < 1)
    throw Error.ResourceNotFound(`Task ${id} not found`)

  return Task.deleteAll([id])
}

Task.deleteAll = async ids => {
  await db.query.promise('task/delete', [ids])

  return Task.getAll(ids)
}

Task.create = async task => {
  await validate(task)

  const checklist = await DealChecklist.get(task.checklist)
  const deal = await promisify(Deal.get)(checklist.deal)

  if (!deal.brand)
    throw Error.Validation('No brand is defined on this deal')

  // const users = await Brand.getUsersByTags(task.tags)
  const users = new Set
  users.add(deal.created_by)

  if (task.created_by)
    users.add(task.created_by)

  const address = Deal.getShortAddress(deal)

  const title = `${address}: ${task.title}`

  task.room = await Room.create({
    room_type: 'Task',
    title,
    users: Array.from(users),
    disable_invitations: true
  })

  const res = await db.query.promise('task/insert', [
    task.room,
    task.checklist,
    task.title,
    task.task_type,
    task.submission,
    task.form,
    task.is_deletable
  ])

  const id = res.rows[0].id

  return Task.get(id)
}

Task.update = async task => {
  await validate(task)

  await db.query.promise('task/update', [
    task.id,
    task.title,
    task.review,
    task.submission,
    task.attention_requested
  ])

  return Task.get(task.id)
}

Task.setSubmission = async (task_id, submission) => {
  const task = await Task.get(task_id)

  submission.path = `tasks/${task_id}`

  const saveActivity = submission => {
    const activity = {
      action: 'UserUpdatedSubmission',
      object_class: 'form_submission',
      object: submission.id
    }

    return promisify(Activity.postToRoom)({
      room_id: task.room,
      activity,
      set_author: false
    })
  }

  const deal = await promisify(Deal.get)(task.deal)
  const populated = await Orm.populate({
    models: [deal],
    associations: [
      'agent.office'
    ]
  })

  submission.deal = populated[0]

  let saved

  if (task.submission) {
    submission.id = task.submission
    await saveActivity(submission)

    saved = await promisify(Form.updateSubmission)(submission)
  } else {
    saved = await promisify(Form.submit)(submission)
    task.submission = saved.submission.id

    await saveActivity(saved.submission)

    await Task.update(task)
  }

  const context = {}

  for(const i in saved.context) {
    context[i] = {
      approved: false,
      value: saved.context[i]
    }
  }

  await Deal.saveContext({
    context,
    deal: task.deal,
    revision: saved.submission.last_revision,
    user: saved.submission.author
  })

  return saved.submission
}

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zadd = promisify(redis.zadd.bind(redis))
const zrem = promisify(redis.zrem.bind(redis))
const del = promisify(redis.del.bind(redis))
const zrange = promisify(redis.zrange.bind(redis))

const queueNotification = async task => {
  await zadd('deal-notifications', Date.now(), task.deal)
  await zadd(`deal-notifications-${task.deal}`, Date.now(), task.id)
}

Task.sendNotifications = async () => {
  const until = Date.now() - config.task_notification_delay

  const deal_ids = await zrangebyscore('deal-notifications', 0, until)

  if (deal_ids.length < 1)
    return

  const deals = await promisify(Deal.getAll)(deal_ids)

  for(const deal of deals)
    await sendDealNotification(deal)
}

const getUsersToNotify = async tasks => {
  const room_ids = tasks.map(t => t.room)
  const users = await Room.getUsers(room_ids)

  return _.chain(users)
    .filter({
      notification_setting: 'N_ALL'
    })
    .map('user')
    .uniq()
    .value()
}

const sendDealNotification = async deal => {
  const task_ids = await zrange(`deal-notifications-${deal.id}`, 0, -1)

  if (task_ids.length < 1)
    return

  const tasks = await Task.getAll(task_ids)

  const review_ids = tasks.map(t => t.review)
  const reviews = await Review.getAll(review_ids)

  const counts = {}
  counts[Review.INCOMPLETE] = 0
  counts[Review.SUBMITTED] = 0
  counts[Review.DECLINED] = 0
  counts[Review.APPROVED] = 0

  for(const review of reviews)
    counts[review.status]++

  const notification = {}
  notification.subject_class = 'Deal'
  notification.subject = deal.id
  notification.action = 'Reviewed'
  notification.object_class = 'Deal'
  notification.object = deal.id
  notification.title = Deal.getStreetAddress(deal)
  notification.data = counts
  notification.message = ''

  const user_ids = await getUsersToNotify(tasks)

  await promisify(Notification.issueForUsers)(notification, user_ids, {})

  await zrem('deal-notifications', deal.id)
  await del(`deal-notifications-${deal.id}`)
}

Task.setReview = async (task_id, review) => {
  const task = await Task.get(task_id)

  if (task.review)
    await Review.update(task.review, review)
  else {
    const saved = await Review.create(review)
    task.review = saved.id
    await Task.update(task)
  }

  const activity = {
    object_class: 'review',
    object: task.review,
    action: 'UserUpdatedReview'
  }

  await promisify(Activity.postToRoom)({
    room_id: task.room,
    activity,
    push: false
  })

  if (review.status === Review.APPROVED || review.status === Review.DECLINED)
    await queueNotification(task)

  return Task.get(task_id)
}

Task.addUser = async ({user, task_id}) => {
  const task = await Task.get(task_id)

  await promisify(Deal.limitAccess)({
    user,
    deal_id: task.deal
  })

  const room = await promisify(Room.get)(task.room)
  if (room.users.includes(user.id))
    return

  try {
    await promisify(Room.addUser)({
      inviting_id: false,
      user_id: user.id,
      room_id: task.room,
      notification_setting: 'N_MENTIONS',
      relax: true
    })
  } catch(e) {
    /* Due to some race conditions, it might happen
     * that we try adding a user to a room at almost the same time.
     * This makes sure if that happens, its alright
     */
    if (e.http === 409)
      return

    throw e
  }
}

Task.associations = {
  room: {
    model: 'Room'
  },

  submission: {
    model: 'Submission'
  },

  review: {
    model: 'Review'
  }
}

module.exports = Task
