const timestamp = new Date()

const activity = {
  title: 'Hello, CRM World!',
  timestamp: timestamp.getTime() / 1000,
  activity_type: 'Todo'
}

module.exports = {
  activity
}