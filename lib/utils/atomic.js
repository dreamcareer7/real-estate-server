const _ = require('lodash')
const db = require('./db.js')
const AssertionError = require('assertion-error')

function transaction (req, res, next) {
  const context = Context.create({
    id: req.rechat_id,
    created_at: req.start
  })

  context.enter()

  Context.log('DB Connection 🕑')

  db.conn(function (err, conn, done) {
    let handled = false

    if (err) {
      Context.log('DB Connection ✖')
      return next(Error.Database(err))
    }

    Context.log('DB Connection ✓')
    context.watchOver(req)
    context.watchOver(res)

    const rollback = function () {
      Context.unset('db')

      handled = true
      Context.log('Rolling back'.red, req.method.yellow, req.url)
      conn.query('ROLLBACK', () => {
        done()
      })
    }

    conn.query('BEGIN', function (err) {
      if (err) {
        return next(Error.Database(err))
      }

      Context.set({
        db: conn,
        jobs: []
      })

      return context.run(next)
    })

    const end = res.end

    context.on('error', function (e) {
      // Request comes through, 3 async operations start. Lets call them a,b,c.
      // a fails.
      // We rollback and send error
      // b fails, but we already have rolled back the connection and released the connection and sent the error
      // So just ignore b.
      // Working of this situation is tested by unit test atomic/async_fail.
      // /GET/admin/async_fail emits this situation

      // Also, We have already responded. The request is complete. However, an error has happened on the background.
      // We cannot Rollback. User already counts on the response. We probably have already rollback/commited.
      if (handled) {
        Context.log('⚠ Panic after request is complete:'.yellow, _.omit(e, 'domain'))
        return
      }

      delete e.domain
      delete e.domainThrown
      delete e.domainEmitter
      delete e.domainBound

      // res.end() is hijacked by us to COMMIT when we're done.
      // Since we want to close the connection, we need to use res.error()
      // but res.error will end up commiting since it uses the hijacked version of res.end()
      // So we undo our hijacking of res.end() and make sure we can safely do res.error()
      res.end = end

      if (e instanceof AssertionError) {
        e = Error.Validation({
          message: e.message,
          stack: e.stack
        })
      }

      let status = e.http

      if (!status)
        status = 500

      res.status(status)

      if (status >= 500)
        res.json({message: 'Internal Error'})
      else
        res.json(e)

      if (e && !e.skip_trace_log)
        Context.log('⚠ Panic:'.yellow, e)

      rollback()
    })

    res.end = function (data, encoding, callback) {
      if (handled)
        return

      handled = true
      conn.query('COMMIT', function () {
        Context.log('Committed 👌')
        Context.unset('db')

        const jobs = Context.get('jobs')
        Job.handle(jobs, err => {
          if (err)
            Context.log('⚠ JOB Panic:'.red, err, err.stack)

          end.call(res, data, encoding, callback)
          done()
        })

        Intercom.handleEvents(req, res, Context.get('intercom'))
      })
    }

    // You might want to ask yourself why this is necessary?
    // Looks like that res.end() does not get called if a connection gets
    // terminated halfway through. What happens is a sequence of funny events known to our team as
    // "The Fucking Timeout Issues". We make sure that if a request gets closed for any reason,
    // we do a rollback on current transction and immediately terminate whatever we're doing.
    const onClose = () => {
      if (handled)
        return

      handled = true
      Context.log(req.rechat_id.green, '☠ Connection closed by peer', req.url, req.user ? req.user.email : 'Guest')
      rollback()
    }
    req.on('close', onClose)
  })
}

module.exports = function (app) {
  app.use(transaction)

  app.on('after loading routes', () => {
    // If an error happens on any of the middlewares/controllers, this middleware will be called
    // If the error happens before our atomic controller, there wont be any context
    app.use((err, req, res, next) => {
      const context = Context.getActive()
      if (context)
        return Context.emit('error', err)

      res.status(500)
      res.json({
        error: err,
        status: 'Error'
      })
    })
  })
}
