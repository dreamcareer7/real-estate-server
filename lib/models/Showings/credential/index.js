/**
 * @namespace ShowingsCredential
 */


const ShowingsCredential = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = ShowingsCredential