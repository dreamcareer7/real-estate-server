const promisify = require('../../utils/promisify')
const db        = require('../../utils/db')
const validator = require('../../utils/validator')
const redis     = require('../../data-service/redis').createClient()

const Orm = {
  ...require('../Orm/index'),
}

const { addUser }     = require('../Room/users/add')
const { limitAccess } = require('../Deal/access')
const { create: createRoom } = require('../Room/create')
const { get: getRoom }       = require('../Room/get') 
const { get: getChecklist }  = require('../Deal/checklist/get')
const { addSeamlessMiddleware }  = require('../Message/post')

const RoomActivity = require('../Activity/room')
const Review       = require('../Review')
const Submission   = require('../Form/submission')

const { notifyById }       = require('../Deal/live')
const { get: getDeal } = require('../Deal/get')

const zadd   = promisify(redis.zadd.bind(redis))

const { get } = require('./get')


const {
  GENERIC,
  FORM,
  GENERAL_COMMENTS,
  YARD_SIGN,
  OPEN_HOUSE,
  MEDIA,
  SPLITTER,
  APPLICATION
} = require('./constants')

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
      enum: [
        GENERIC,
        FORM,
        GENERAL_COMMENTS,
        YARD_SIGN,
        OPEN_HOUSE,
        MEDIA,
        SPLITTER,
        APPLICATION
      ]
    }
  }
}

const validate = promisify(validator.bind(null, schema))

const queueNotification = async task => {
  await zadd('deal-notifications', Date.now(), task.deal)
  await zadd(`deal-notifications-${task.deal}`, Date.now(), task.id)
}

const notifySeamlessToBackoffice = async({message, room, user}) => {
  const row = await db.selectOne('task/by-room', [room.id])

  if (!row) {
    return
  }

  const task = await get(row.id)

  await setAttention({
    task,
    user,
    attention_requested: true
  })
}

const setAttention = async ({task, attention_requested, user}) => {
  const deal = await promisify(getDeal)(task.deal)

  if(!task.attention_requested && attention_requested) {
    const activity = {
      action: 'UserNotifiedOffice',
      object_class: 'deal_task',
      object: {
        type: 'deal_task',
        task,
        deal
      }
    }

    await promisify(RoomActivity.postToRoom)({
      room_id: task.room,
      user_id: user.id,
      activity
    })
  }

  task.attention_requested = attention_requested

  const updated = await update(task)

  await notifyById(updated.deal)

  return updated
}

const create = async task => {
  await validate(task)

  const checklist = await getChecklist(task.checklist)
  const deal = await promisify(getDeal)(checklist.deal)

  if (!deal.brand) {
    throw Error.Validation('No brand is defined on this deal')
  }

  // const users = await Brand.getUsersByTags(task.tags)
  const users = new Set
  users.add(deal.created_by)

  if (task.created_by) {
    users.add(task.created_by)
  }

  const address = deal.title
  const title = `${address}: ${task.title}`

  task.room = await createRoom({
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
    task.is_deletable,
    task.required,
    task.origin,
    task.order,
    task.acl,
    task.application
  ])

  const id = res.rows[0].id

  return get(id)
}

const update = async task => {
  await validate(task)

  await db.query.promise('task/update', [
    task.id,
    task.title,
    task.review,
    task.submission,
    task.attention_requested,
    task.required,
    task.order,
    task.acl
  ])

  return get(task.id)
}

const taskAddUser = async ({user, task_id}) => {
  const task = await get(task_id)

  await limitAccess({ user, deal_id: task.deal })

  const room = await promisify(getRoom)(task.room)
  if (room.users.includes(user.id)) {
    return task
  }

  try {
    await promisify(addUser)({
      inviting_id: false,
      user_id: user.id,
      room_id: task.room,
      notification_setting: 'N_MENTIONS',
      relax: true
    })

    return task

  } catch(e) {
    /* Due to some race conditions, it might happen
     * that we try adding a user to a room at almost the same time.
     * This makes sure if that happens, its alright
     */
    if (e.http === 409) {
      return
    }

    throw e
  }
}

const setSubmission = async (task_id, submission, log = true) => {
  const task = await get(task_id)

  submission.path = `tasks/${task_id}`
  submission.form_id = task.form

  const saveActivity = submission => {
    if (!log) {
      return
    }

    const activity = {
      action: 'UserUpdatedSubmission',
      object_class: 'form_submission',
      object: submission.id
    }

    return promisify(RoomActivity.postToRoom)({
      room_id: task.room,
      activity,
      set_author: false
    })
  }

  const deal = await promisify(getDeal)(task.deal)
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

    saved = await Submission.update(submission)

  } else {

    saved = await Submission.create(submission)
    task.submission = saved.id

    await saveActivity(saved)

    await update(task)
  }

  return saved
}

const setReview = async (task_id, review) => {
  const task = await get(task_id)

  if (task.review) {
    await Review.update(task.review, review)

  } else {

    const saved = await Review.create(review)
    task.review = saved.id
    await update(task)
  }

  const activity = {
    object_class: 'review',
    object: task.review,
    action: 'UserUpdatedReview'
  }

  await promisify(RoomActivity.postToRoom)({
    room_id: task.room,
    activity,
    push: false
  })

  if (review.status === Review.APPROVED || review.status === Review.DECLINED) {
    await queueNotification(task)
  }

  return get(task_id)
}

addSeamlessMiddleware(notifySeamlessToBackoffice)


module.exports = {
  create,
  update,
  addUser: taskAddUser,
  setSubmission,
  setReview,
  setAttention
}
