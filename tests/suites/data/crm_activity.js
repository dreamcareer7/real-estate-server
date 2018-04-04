const timestamp = new Date()

const activity = {
  description: 'Hello, Activity World!',
  timestamp: timestamp.getTime() / 1000,
  activity_type: 'Todo'
}

module.exports = {
  activity
}