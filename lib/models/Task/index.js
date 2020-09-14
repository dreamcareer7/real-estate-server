const Task = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete'),
  ...require('./notifications'),
}

module.exports = Task
