/**
 * @namespace UsersJob
 */


const UsersJob = {
  ...require('./get'),
  ...require('./delete'),
  ...require('./google'),
  ...require('./microsoft')
}


module.exports = UsersJob