const ContactAttribute = require('../../Contact/attribute/emitter')
const Contact = require('../../Contact/emitter')
const Context = require('../../Context')
const workers = require('./workers')

/**
 * @param {(...args: unknown[]) => unknown} fn
 * @param {string} msg
 */
function logAndHandle (fn, msg) {
  /** @param {...any} args */
  return function loggingHandler (...args) {
    Context.log(msg)
    return fn(...args)
  }
}

module.exports = function attachBrandTriggerEventHandler () {
  Contact.on('update', logAndHandle(
    workers.contactsUpdated,
    'Contact:updated'
  ))
  
  ContactAttribute.on('create:dateAttribute', logAndHandle(
    workers.dateAttributesCreated,
    'ContactAttribute:create:dateAttribute'
  ))
  
  ContactAttribute.on('delete:dateAttribute', logAndHandle(
    workers.dateAttributesDeleted,
    'ContactAttribute:delete:dateAttribute'
  ))
}
