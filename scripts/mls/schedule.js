var async = require('async');
require('../connection.js');
require('../../lib/utils/db.js');
var _ = require('underscore');
var spawn = require('child_process').spawn;
var config = require('../../lib/config.js');

var definitions = config.scheduler.queues;
var queues = {};
var tasks = {};

Object.keys(definitions).forEach( queue_name => {
  queues[queue_name] = async.priorityQueue(runTask, 1);
  queues[queue_name].drain = schedule.bind(null, queue_name);

  Object.keys(definitions[queue_name]).forEach( task_name => {
    var definition = definitions[queue_name][task_name];
    definition.name = task_name;
    definition.queue = queue_name;
    tasks[task_name] = definition;
  })

  schedule(queue_name);
});


function processLastRuns(queue, last_runs) {
  Object.keys(tasks)
  .map( name => tasks[name] )
  .filter( (task, index) => {
    if(task.queue !== queue)
      return false;

    var run = last_runs[index];

    if(!run)
      return true; // Was never executed.

    var elapsed = (new Date).getTime() - run.created_at.getTime();

    console.log(queue, task.name, elapsed, task.interval)
    return elapsed >= task.interval;
  })
  .forEach(task => {
    queues[task.queue].push(task, task.priority);
  });

  if(queues[queue].length() < 1) {
    setTimeout(schedule.bind(null, queue), 5*1000)
  }
}

function schedule(queue) {
  console.log('Scheduling', queue)
  async.map(
    Object.keys(tasks)
      .filter( t => tasks[t].queue === queue )
  , MLSJob.getLastRun, (err, last_runs) => {
    if(err)
      return console.log(err)

      processLastRuns(queue, last_runs);
  });
}

function runTask(task, cb) {
  console.log('Spawning', task.name)
  var timedout = () => {
    console.log('Timed out', task.name);
    p.kill();
  }

  var timeout = setTimeout(timedout, 20*60*1000);

  var alreadyDone = false;
  var done = function() {
    if(alreadyDone)
      return ;
    alreadyDone = true;
    console.log('Finished', task.name);
    cb();
    clearTimeout(timeout)
  }
  var c = _.clone(task.command);
  var p = spawn(__dirname+'/'+c[0], c.splice(1));
  p.on('close', done);

  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
}