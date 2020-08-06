/**
 * @namespace Task
 */


const Task = {
  ...require('./static'),
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}


module.exports = Task