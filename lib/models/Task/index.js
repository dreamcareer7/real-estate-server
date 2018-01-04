const promisify = require('../../utils/promisify')
const db = require('../../utils/db')
const validator = require('../../utils/validator')

Task = {}

Orm.register('task', 'Task')

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
    throw new Error.Validation('No brand is defined on this deal')

//   const users = await Brand.getUsersByTags(task.tags)
  const users = []
  users.push(deal.created_by)

  const title = `${Deal.getContext(deal, 'full_address')} - ${task.title}`

  const room = await promisify(Room.create)({
    room_type: 'Task',
    title,
    users,
    disable_invitations: true
  })

  task.room = room.id

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
    task.needs_attention
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
      activity
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

  await Deal.saveContext({
    context: saved.context,
    deal: task.deal,
    revision: saved.submission.last_revision,
    user: saved.submission.author
  })

  return saved.submission
}

Task.setReview = async (task_id, review) => {
  const task = await Task.get(task_id)

  const deal = await promisify(Deal.get)(task.deal)

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

  let push = false
  if (review.status === Review.APPROVED || review.status === Review.DECLINED) {
    push = n => {
      n.auxiliary_subject_class = 'Deal'
      n.auxiliary_subject = deal.id
    }
  }

  await promisify(Activity.postToRoom)({
    room_id: task.room,
    activity,
    push
  })

  return Task.get(task_id)
}

Task.addUser = async ({user, task_id}) => {
  const task = await Task.get(task_id)

  const room = await promisify(Room.get)(task.room)
  if (room.users.includes(user.id))
    return

  await promisify(Deal.limitAccess)({
    user,
    deal_id: task.deal
  })

  try {
    await promisify(Room.addUser)({
      inviting_id: false,
      user_id: user.id,
      room_id: task.room,
      notification_setting: 'N_MENTIONS'
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
