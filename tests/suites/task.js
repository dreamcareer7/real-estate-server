var uuid = require('node-uuid');
var task_response = require('./expected_objects/task.js');

registerSuite('contact', ['create']);
registerSuite('transaction', ['create']);

var create = (cb) => {
  return frisby.create('create new task')
    .post('/tasks', {
      user: results.contact.create.data[0].contact_user.id,
      title: 'NewTask',
      due_date: 2015,
      status: 'New',
      transaction: results.transaction.create.data.id,
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: task_response
    });
}

var assign = (cb) => {
  return frisby.create('assign contact to a task')
    .post('/tasks/' + results.task.create.data.id + '/contacts', {
      contacts:[results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: task_response
    });
}

var assign400 = (cb) => {
  return frisby.create('assign contact to a task')
    .post('/tasks/' + results.task.create.data.id + '/contacts')
    .after(cb)
    .expectStatus(400)
}

var getTask = (cb) => {
  return frisby.create('get task by id')
    .get('/tasks/' + results.task.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: task_response
    });
}

var getUserTasks = (cb) => {
  return frisby.create('get user\'s task')
    .get('/tasks')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: [task_response]
    });
}

var patchTask = (cb) => {
  return frisby.create('update a task')
    .put('/tasks/' + results.task.create.data.id,{
      title: 'UpdatedTask'
  })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: task_response
    });
}

var withdraw = (cb) => {
  return frisby.create('withdraw contact from a task')
    .delete('/tasks/' + results.task.create.data.id + '/contacts/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(200)
}

var deleteTask = (cb) => {
  return frisby.create('delete a task')
    .delete('/tasks/' + results.task.create.data.id)
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  create,
  assign,
  assign400,
  getTask,
  getUserTasks,
  patchTask,
  //withdraw,
  //deleteTask
}
