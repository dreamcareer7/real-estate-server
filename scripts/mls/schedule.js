var async = require('async');
require('../connection.js');
require('../../lib/utils/db.js');
require('../../lib/models/index.js')();
var _ = require('underscore');
var spawn = require('child_process').spawn;
var config = require('../../lib/config.js');

var tasks = config.scheduler.tasks;

var queue = async.priorityQueue(runTask, 1);
queue.drain = schedule;

function processLastRuns(err, last_runs) {
  if(err)
    return console.log('Error fetching last runs:', err);

  Object.keys(tasks).filter( (name, index) => {
    var run  = last_runs[index];
    var task = tasks[name];
    if(!run)
      return true; // Was never executed.

    var elapsed = (new Date).getTime() - run.created_at.getTime();

    return elapsed >= task.interval;
  })
  .forEach(name => {
    var task = tasks[name];
    task.name = name;
    queue.push(task, tasks[name].priority)
  });

  if(queue.length() < 1)
    setTimeout(schedule, 30*1000)
}

function schedule() {
  async.map(Object.keys(tasks), MLSJob.getLastRun, processLastRuns);
}

function runTask(task, cb) {
  console.log('Spawning', task.name)
  var c = _.clone(task.command);
  var p = spawn(__dirname+'/'+c[0], c.splice(1));
  p.on('close', () => console.log('Finished', task.name));
  p.on('close', cb);

  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
}


schedule()