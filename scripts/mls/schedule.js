var async = require('async');
require('../connection.js');
require('../../lib/utils/db.js');
require('../../lib/models/index.js')();
var _ = require('underscore');
var spawn = require('child_process').spawn;

var tasks = [
  {
    class:'Listing',
    resource:'Property',
    command: ['listings.js', '-p', '-r', '-e', '-n', '-l', 10],
    interval:300000,
    priority:0
  },

  {
    class:'Agent',
    resource:'Agent',
    command: ['agents.js', '-l', 10],
    interval:300000,
    priority:2
  },

  {
    class:'Media',
    resource:'Media',
    command: ['photos.js', '-d', '100', '-u', '100', '-l', 10],
    interval: 0,
    priority:1
  }
];

function getLastRun(task, cb) {
  MLSJob.getLastRun(task.class, task.resource, cb)
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
    .sort( (a,b) => {
      if(a.priority > b.priority) return 1;
      if(a.priority < b.priority) return -1;
      return 0;
    })
    .forEach(addToQueue)
  }

  async.map(tasks, getLastRun, processLastRuns);
}

var queue = async.queue(runTask, 1);
queue.drain = schedule;

function addToQueue(task) {
  queue.push(task);
}

function runTask(task, cb) {
  console.log('Spawning', task.resource, task.class)
  var c = _.clone(task.command);
  var p = spawn(__dirname+'/'+c[0], c.splice(1));
  p.on('close', () => console.log('Finished', task.resource, task.class));
  p.on('close', cb);

  p.stdout.pipe(process.stdout);
}


schedule()