const async = require('async')
require('../connection.js')
require('../../lib/utils/db.js')
const _ = require('underscore')
const spawn = require('child_process').spawn
const config = require('../../lib/config.js')

const definitions = config.scheduler.queues
const queues = {}
const tasks = {}

Object.keys(definitions).forEach(queue_name => {
  queues[queue_name] = async.priorityQueue(runTask, 1)
  queues[queue_name].drain = schedule.bind(null, queue_name)

  Object.keys(definitions[queue_name]).forEach(task_name => {
    const definition = definitions[queue_name][task_name]
    definition.name = task_name
    definition.queue = queue_name
    tasks[task_name] = definition
  })

  schedule(queue_name)
})

function processLastRuns (queue, tasks) {
  tasks
  .filter(task => {
    if (!task.run)
      return true // Was never executed.

    const elapsed = (new Date()).getTime() - task.run.created_at.getTime()

    return elapsed >= task.definition.interval
  })
  .forEach(task => {
    queues[task.definition.queue].push(task.definition, task.definition.priority)
  })

  if (queues[queue].length() < 1) {
    setTimeout(schedule.bind(null, queue), 5 * 1000)
  }
}

function schedule (queue) {
  const current_tasks = Object.keys(tasks)
    .filter(t => tasks[t].queue === queue)

  async.map(current_tasks, MLSJob.getLastRun, (err, last_runs, c) => {
    if (err)
      return console.log(err)

    const results = current_tasks.map((t, i) => {
      return {
        definition: tasks[t],
        run:        last_runs[i]
      }
    })
    processLastRuns(queue, results)
  })
}

function runTask (task, cb) {
  console.log('Spawning', task.name)
  const timedout = () => {
    console.log('Timed out', task.name)
    p.kill()
  }

  const timeout = setTimeout(timedout, 20 * 60 * 1000)

  let alreadyDone = false
  const done = function () {
    if (alreadyDone)
      return
    alreadyDone = true
    console.log('Finished', task.name)
    cb()
    clearTimeout(timeout)
  }
  const c = _.clone(task.command)
  const p = spawn(__dirname + '/' + c[0], c.splice(1))
  p.on('close', done)

  p.stdout.pipe(process.stdout)
  p.stderr.pipe(process.stderr)
}
