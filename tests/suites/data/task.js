const config = require('../../../lib/config.js')

const due_date = new Date()

const task = {
  title: 'Hello, Task World!',
  due_date: due_date.getTime() / 1000,
  task_type: 'Todo',
  metadata: {
    template: '<html></html>'
  }
}

const fixed_reminder = {
  is_relative: false,
  timestamp: task.due_date - 3600
}

const relative_reminder = {
  is_relative: true,
  timestamp: task.due_date - 7200
}

const abbasUser = {
  username: 'abbas',
  first_name: 'Abbas',
  last_name: 'Gholavi',
  email: 'abbas@rechat.com',
  email_confirmed: true,
  user_type: 'Agent',
  password: '123456',
  phone_number: '+989123456789',
  grant_type: 'password',
  cover_image_url: 'http://rechat.com/cover_image_url/cover_image_url.png',
  cover_image_thumbnail_url:
    'http://rechat.com/cover_image_thumbnail_url/cover_image_thumbnail_url.png',
  profile_image_url:
    'http://rechat.com/profile_image_url/profile_image_url.png',
  profile_image_thumbnail_url:
    'http://rechat.com/profile_image_thumbnail_url/profile_image_thumbnail_url.png',
  address: {
    title: 'foo'
  },
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
}

module.exports = {
  due_date,
  task,
  fixed_reminder,
  relative_reminder,
  abbasUser
}
