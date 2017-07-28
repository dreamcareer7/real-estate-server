const promisify = require('../../utils/promisify')
const db = require('../../utils/db')
const validator = require('../../utils/validator')

Task = {}

Orm.register('task', 'Task')

const types = {
  Generic: require('./Generic.js'),
  Form: require('./Form.js')
}

const type = task => types[task.task_type]


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
    },

    status: {
      type: 'string',
      required: true,
      enum: [ 'New', 'InProgress', 'Done' ]
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

const addTag = async (task, tag) => {
  await db.query.promise('task/tags/add', [task, tag])
}

Task.create = async task => {
  await validate(task)

  const deal = await promisify(Deal.get)(task.deal)

  if (!deal.brand)
    throw new Error.Validation('No brand is defined on this deal')

  const users = await Brand.getUsersByTags(task.tags)
  users.push(deal.created_by)

  const room = await promisify(Room.create)({
    room_type: 'Task',
    users,
    disable_invitations: false
  })

  task.room = room.id

  const res = await db.query.promise('task/insert', [
    task.room,
    task.deal,
    task.title,
    task.status,
    task.task_type,
    task.submission,
    task.form
  ])

  const id = res.rows[0].id

  if (task.tags)
    for (const tag of task.tags)
      await addTag(id, tag)

  return Task.get(id)
}

Task._update = async task => {
  await db.query.promise('task/update', [
    task.id,
    task.title,
    task.status,
    task.review,
    task.submission,
    task.needs_attention
  ])
}

const updateDeal = async (deal_id, submission) => {
  const deal = await promisify(Deal.get)(deal_id)
  const context = await promisify(Form.extractContextFromSubmission)(submission)

  /* If each context === proposed_value, we wont store the context
   * That's because we have the proposed_value coming from other sources (like MLS)
   * And they are updated automatically
   */

  for (const name in context) {
    if (!deal.proposed_values)
      continue

    if (!deal.proposed_values[name])
      continue

    if (deal.proposed_values[name] !== context[name])
      continue

    delete context[name]
  }

  for(const name in context) {
    if (!deal.context)
      deal.context = {}

    deal.context[name] = context[name]
  }

  await promisify(Deal.update)(deal)
}

Task.update = async task => {
  await validate(task)

  await Task._update(task)

  await Task.evaluate(task.id)

  return Task.get(task.id)
}

Task.setSubmission = async (task_id, submission) => {
  const task = await Task.get(task_id)

  submission.path = `tasks/${task_id}`

  const saveActivity = submission => {
    const activity = {
      action: 'UserUpdatedSubmission',
      object_class: 'Submission',
      object: submission.id
    }

    return promisify(Activity.postToRoom)({
      room_id: task.room,
      activity
    })
  }

  if (task.submission) {
    submission.id = task.submission
    await saveActivity(submission)

    return promisify(Form.updateSubmission)(submission)
  }

  const saved = await promisify(Form.submit)(submission)
  task.submission = saved.id

  await saveActivity(saved)

  await Task.update(task)

  await updateDeal(task.deal, submission)

  await Task.evaluate(task_id)

  return saved
}

Task.setReview = async (task_id, review) => {
  const task = await Task.get(task_id)

  const deal = await promisify(Deal.get)(task.deal)

  if (deal.created_by === review.created_by) {
    /* Task owner can only submit review requests or change their status to pending.
     * Approving or rejecting should only be done by broker
     */

    if (review.status === Review.APPROVED || review.status === Review.REJECTED)
      throw Error.Forbidden()
  }

  if (task.review)
    await Review.update(task.review, review)
  else {
    const saved = await Review.create(review)
    task.review = saved.id
    await Task._update(task)
  }

  const activity = {
    object_class: 'Review',
    object: task.review,
    action: 'UserUpdatedReview'
  }

  await promisify(Activity.postToRoom)({
    room_id: task.room,
    activity
  })

  return Task.evaluate(task_id)
}

Task.evaluate = async task_id => {
  const task = await Task.get(task_id)
  await type(task).evaluate(task)
}

Task.addBrandTasks = async ({brand_id, deal_id, flags}) => {
  const res = await db.query.promise('task/tags/brand', [brand_id, flags])
  const tasks = res.rows

  for(const template of tasks) {
    template.brand = brand_id
    template.deal = deal_id
    template.status = 'New'
    await Task.create(template)
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