/**
 * @namespace Task
 */


const Task = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}


module.exports = Task