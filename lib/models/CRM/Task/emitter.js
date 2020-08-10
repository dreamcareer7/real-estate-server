const { EventEmitter } = require('events')

class CrmTaskEventEmitter extends EventEmitter {}

module.exports = new CrmTaskEventEmitter