/**
 * @namespace Message
 */

const EventEmitter = require('events').EventEmitter
const Orm = require('../Orm')

const emitter = new EventEmitter()

const Message = {
  ...require('./get'),
  ...require('./post'),
  ...require('./email')
}

Orm.register('message', 'Message', Message)

Message.on = emitter.on.bind(emitter)


/**
 * Stripping the `Message` object off of it's sensitive contents for public consumption
 * @name publicize
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {Message#message} model - message model to be modified
 * @returns {Message#message} modified message object
 */
Message.publicize = function (model) {
  if (model.total) delete model.total

  return model
}

Message.associations = {
  author: {
    optional: true,
    model: 'User'
  },

  recommendation: {
    optional: true,
    model: 'Recommendation'
  },

  notification: {
    optional: true,
    model: 'Notification'
  },

  attachments: {
    collection: true,
    model: 'AttachedFile',
    default_value: () => []
  }
}

module.exports = Message
