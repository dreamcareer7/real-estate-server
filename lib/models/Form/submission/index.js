/**
 * @namespace Submission
 */


const Submission = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./flatten'),

  FAIR: 'Fair',
  RAFT: 'Draft'
}


module.exports = Submission
