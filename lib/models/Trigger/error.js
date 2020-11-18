class TriggerError extends Error {
  constructor(message, retry = false) {
    super(message)
    this.retry = retry
  }
}

module.exports = {
  TriggerError,
}
