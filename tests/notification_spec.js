var deleteMessage = (cb) => {
  return frisby.create('delete message')
         .delete('/notifications', {
           message:'a50c6006-7833-11e5-ada6-2722df4eb351'
         })
         .after(cb);
}

var tasks = {
  deleteMessage
}

Tests.run(tasks);

module.exports = tasks;