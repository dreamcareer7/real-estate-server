const Orm = require('../Orm/registry')
const ObjectUtil = require('../ObjectUtil')
const Crypto = require('../Crypto')
const Url    = require('../Url')

const { getAll } = require('./get')

const { FORM } = require('./constants')

const publicize = task => {
  // pdf_url is only valid if it's a task_type.form
  // and actually connected to a rechat form
  if (task.task_type !== FORM || !task.form) {
    return
  }

  const user = ObjectUtil.getCurrentUser()

  const data = {
    task: task.id,
    user,
    date: new Date()
  }

  const hash = Crypto.encrypt(JSON.stringify(data))

  task.pdf_url = Url.api({
    uri: `/tasks/${task.id}/submission.pdf`,
    query: {
      hash
    }
  })
}


const associations = {
  room: {
    model: 'Room'
  },

  submission: {
    model: 'Submission'
  },

  review: {
    model: 'Review'
  },

  application: {
    model: 'Application',
    enabled: false
  }
}

Orm.register('task', 'Task', {
  getAll,
  publicize,
  associations
})
