/**
 * @namespace CrmAssociation
 */

const emitter = require('./emitter')


const CrmAssociation = {
  on: emitter.on.bind(emitter),
  emit: emitter.emit.bind(emitter),

  ...require('./get'),
  ...require('./upsert')
}


module.exports = CrmAssociation