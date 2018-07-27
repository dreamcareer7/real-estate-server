const timestamp = new Date()

const touch = {
  description: 'Hello, Activity World!',
  timestamp: timestamp.getTime() / 1000,
  activity_type: 'Call'
}

module.exports = {
  touch
}