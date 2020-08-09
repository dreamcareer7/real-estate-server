const { filter } = require('./filter')
const { fastFilter } = require('./fast_filter')
const emitter = require('./emitter')

module.exports = {
  filter,
  fastFilter,

  ...require('./get'),
  ...require('./manipulate'),
  ...require('./access'),
  ...require('./validate'),

  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
  emit: emitter.emit.bind(emitter),
}
