const ContactAttribute = require('../../Contact/attribute/emitter')
const Contact = require('../../Contact/emitter')
const Context = require('../../Context')
const Trigger = require('../emitter')
const workers = require('./workers')

/**
 * @param {object} args
 * @param {string} args.event_type
 * @param {...any} etc
 */
function contactsUpdated (args, ...etc) {
  if (args.event_type === 'merge') {
    return workers.contactsMerged(args, ...etc)
  }
}

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

module.exports = function attachBrandTriggerEventHandler () {
  Contact.on('update', logAndHandle(
    contactsUpdated,
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
  
  Trigger.on('execute:flowTrigger', logAndHandle(
    workers.flowTriggerExecuted,
    'Trigger:execute:flowTrigger'
  ))
}
