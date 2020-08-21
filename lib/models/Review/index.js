/**
 * @namespace Review
 */


const Review = {
  ...require('./get'),
  ...require('./upsert'),

  INCOMPLETE: 'Incomplete',
  SUBMITTED: 'Submitted',
  DECLINED: 'Declined',
  APPROVED: 'Approved'
}


module.exports = Review