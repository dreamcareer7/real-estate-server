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

const DealRole = require('../Deal/role/get')
const Deal = require('../Deal/constants')

const RoomActivity = require('../Activity/room')
const Review       = require('../Review')
const Submission   = require('../Form/submission')

const { notifyById }       = require('../Deal/live')
const { get: getDeal } = require('../Deal/get')

const zadd   = promisify(redis.zadd.bind(redis))

const { get } = require('./get')

const _ = require('lodash')

const {
  GENERIC,
  FORM,
  GENERAL_COMMENTS,
  YARD_SIGN,
  OPEN_HOUSE,
  MEDIA,
  SPLITTER,
  APPLICATION,
  AGENTS
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

const getInterestedRoles = deal => {
  const buying_roles = [
    'BuyerAgent',
    'CoBuyerAgent',
  ]

  const seller_roles = [
    'SellerAgent',
    'CoSellerAgent'
  ]

  return deal.deal_type === Deal.BUYING ? buying_roles : seller_roles
}

const filterInterestedUsers = async (deal, task, users) => {
  /*
   * Now we have to determine which users to add to the Task chat room.
   * So, there's 2 reasons we add people to a room:
   * 1. So they get access to read/write messages to it
   * 2. So they can get seamless email notification from the room
   * Now, admins don't really need that kind of notification. So, this function makes sure we will only add agents to those rooms so
   * only agents receive notifications.
   *
   * But, there's an imoportant point here.
   * Sometimes the tasks have access controls: Some tasks are admin-only.
   * For those tasks, we should NOT add agents to the room. Otherwise they'd start getting notifications for tasks they are not allowed to see.
   *
   * So, if the task is Admin-Only, don't add any users to it.
   */
  const roles = await DealRole.getAll(deal.roles)
  const interested_roles = getInterestedRoles(deal)
  const indexed_roles = _.chain(roles).filter(r => Boolean(r.user)).keyBy('user').value()

  return users
    .map(user_id => {
      const role = indexed_roles[user_id]
      const interested = role && interested_roles.includes(role.role)

      if (!role || !interested)   // The user we are considering to add to this task is not an agent of the deal (He is like an admin)
        return {                  // So we assume it's an admin, and thus, will add him to the task with N_MENTIONS so
          user_id,                // They won't receive notifications personally
          notification_setting: 'N_MENTIONS'
        }

      if (!task.acl.includes(AGENTS))
        return false

      return {
        user_id,
        notification_setting: 'N_ALL' // User is an agent, and must be notified for new messages here
      }
    })
    .filter(Boolean)

}

const create = async task => {
  await validate(task)

  const checklist = await getChecklist(task.checklist)
  const deal = await promisify(getDeal)(checklist.deal)

  if (!deal.brand) {
    throw Error.Validation('No brand is defined on this deal')
  }

  // const users = await Brand.getUsersByTags(task.tags)
  const potential_users = new Set
  potential_users.add(deal.created_by)
  task.created_by && potential_users.add(task.created_by)

  const address = deal.title
  const title = `${address}: ${task.title}`

  const users = await filterInterestedUsers(deal, task, Array.from(potential_users))

  task.room = await createRoom({
    room_type: 'Task',
    title,
    users,
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
