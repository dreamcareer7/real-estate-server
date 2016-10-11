/**
 * @namespace controller/task
 */

const async = require('async')

function getUserTasks (req, res) {
  const user_id = req.user.id
  const statuses = req.query.statuses || []

  User.get(user_id, function (err) {
    if (err)
      return res.error(err)

    Task.getForUser(user_id, statuses, function (err, tasks) {
      if (err)
        return res.error(err)

      return res.collection(tasks)
    })
  })
}

function getTask (req, res) {
  const task_id = req.params.id

  Task.get(task_id, function (err, task) {
    if (err)
      return res.error(err)

    res.model(task)
  })
}

function deleteTask (req, res) {
  const task_id = req.params.id

  Task.delete(task_id, function (err, task) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function createTask (req, res) {
  const user_id = req.user.id
  const task = req.body

  User.get(user_id, function (err) {
    if (err)
      return res.error(err)

    task.user = user_id
    Task.create(task, function (err, task) {
      if (err)
        return res.error(err)

      return res.model(task)
    })
  })
}

function assign (req, res) {
  const user_id = req.user.id
  const task_id = req.params.id
  const contacts = req.body.contacts

  if (!Array.isArray(contacts))
    return res.error(Error.Validation('contacts property must be an array of contacts'))

  async.map(contacts, function (r, cb) {
    return Task.assign(user_id, task_id, r, cb)
  }, function (err) {
    if (err)
      return res.error(err)

    Task.get(task_id, function (err, task) {
      if (err)
        return res.error(err)

      return res.model(task)
    })
  })
}

function withdraw (req, res) {
  const task_id = req.params.id
  const contact = req.params.rid

  Task.withdraw(task_id, contact, function (err) {
    if (err)
      return res.error(err)

    Task.get(task_id, function (err, task) {
      if (err)
        return res.error(err)

      return res.model(task)
    })
  })
}

function patchTask (req, res) {
  const task_id = req.params.id
  const data = req.body

  Task.patch(task_id, data, function (err, task) {
    if (err)
      return res.error(err)

    return res.model(task)
  })
}

function attach (req, res) {
  const task_id = req.params.id

  S3.uploadAttachment(req, 'Task', task_id, function (err, task) {
    if (err)
      return res.error(err)

    return res.model(task)
  })
}

function detach (req, res) {
  const task_id = req.params.id
  const attachment_id = req.params.rid

  Attachment.unlink(task_id, attachment_id, err => {
    if (err)
      return res.error(err)

    Task.get(task_id, (err, task) => {
      if (err)
        return res.error(err)

      return res.model(task)
    })
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/tasks', b(createTask))
  app.post('/tasks/:id/contacts', b(assign))
  app.delete('/tasks/:id/contacts/:rid', b(withdraw))
  app.get('/tasks', b(getUserTasks))
  app.get('/tasks/:id', b(getTask))
  app.delete('/tasks/:id', b(deleteTask))
  app.put('/tasks/:id', b(patchTask))
  app.post('/tasks/:id/attachments', b(attach))
  app.delete('/tasks/:id/attachments/:rid', b(detach))
}

module.exports = router
