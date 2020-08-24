/**
 * @namespace Website
 */


const Website = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete'),

  INCOMPLETE: 'Incomplete',
  SUBMITTED: 'Submitted',
  DECLINED: 'Declined',
  APPROVED: 'Approved'
}


module.exports = Website