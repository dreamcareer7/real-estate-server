/**
 * @namespace CrmAssociation
 */


const CrmAssociation = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = CrmAssociation