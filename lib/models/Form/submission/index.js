/**
 * @namespace Submission
 */


const Submission = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./flatten'),

  AIR: 'Fair',
  RAFT: 'Draft'
}


module.exports = Submission