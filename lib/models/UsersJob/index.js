/**
 * @namespace UsersJob
 */


const UsersJob = {
  ...require('./get'),
  ...require('./google'),
  ...require('./microsoft')
}


module.exports = UsersJob