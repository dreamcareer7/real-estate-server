const Contact = require('../Contact/emitter')
const Context = require('../Context')
const workers = require('./worker')


/**
 * @template T
 * @param {(...args: T[]) => unknown} fn
 * @param {string} msg
 */
function logAndHandle (fn, msg) {
  /** @param {...any} args */
  return function loggingHandler (...args) {
    Context.log(msg)
    return fn(...args)
  }
}

module.exports = function attachTriggerEventHandler () {
  Contact.on('delete', logAndHandle(
    workers.contacts_deleted_handler,
    'Contact:deleted'
  ))
}
