function combineHandlers(handlers) {
  const res = {}

  for (const [key, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      res[key] = (job, done) => {
        handler(job).nodeify(done)
      }
    }
    else {
      res[key] = aggregate(handler)
    }
  }

  return res
}

function aggregate(handlers) {
  return (job, done) => {
    try {
      const handler = handlers[job.data.type]
      if (typeof handler !== 'function') {
        return done(new Error(`No handler for ${job.data.type} job.`))
      }

      handler(job).nodeify(done)
    }
    catch (ex) {
      console.error(ex)
    }
  }
}

function enqueueJob(queue, type, data) {
  process.domain.jobs.push(Job.queue.create(queue, {
    ...data,
    type
  }).removeOnComplete(true))
}

module.exports = {
  aggregate,
  combineHandlers,
  enqueueJob
}