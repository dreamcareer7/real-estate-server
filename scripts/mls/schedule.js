var async = require('async');
require('../connection.js');
require('../../lib/utils/db.js');
require('../../lib/models/index.js')();
var _ = require('underscore');
var spawn = require('child_process').spawn;
var config = require('../../lib/config.js');

var tasks = config.scheduler.tasks;

function getLastRun(task, cb) {
  MLSJob.getLastRun(task.class, task.resource, cb)
}

var queue = async.priorityQueue(runTask, 1);
queue.drain = schedule;

function addToQueue(task) {
  queue.push(task, task.priority);
}

function schedule() {
  console.log('Scheduling tasks');

  var processLastRuns = (err, last_runs) => {
    tasks.filter( (task, index) => {
      var run = last_runs[index];
      if(!run)
        return true; // Was never executed.

      var elapsed = (new Date).getTime() - run.created_at.getTime();

      return elapsed >= task.interval;
    })
    .forEach(addToQueue);

    if(queue.length() < 1)
      setTimeout(schedule, 30*1000)
  }

  async.map(tasks, getLastRun, processLastRuns);
}

function runTask(task, cb) {
  console.log('Spawning', task.resource, task.class)
  var c = _.clone(task.command);
  var p = spawn(__dirname+'/'+c[0], c.splice(1));
  p.on('close', () => console.log('Finished', task.resource, task.class));
  p.on('close', cb);

  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
}


schedule()