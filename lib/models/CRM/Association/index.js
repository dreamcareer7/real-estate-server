/**
 * @namespace CrmAssociation
 */


const CrmAssociation = {
  ...require('./emitter'),
  ...require('./get'),
  ...require('./upsert')
}


module.exports = CrmAssociation