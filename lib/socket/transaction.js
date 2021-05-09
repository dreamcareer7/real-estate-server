const db = require('../utils/db.js')
const Context = require('../models/Context')
const Job = require('../models/Job')
const uuid = require('uuid')

const _transaction = (fn, socket, args) => {
  const cb = args[args.length - 1]

  const context = Context.getActive()

  db.conn(function (err, conn, done) {
    let handled = false

    if (err) {
      if (typeof cb === 'function')
        return cb(Error.Database(err))

      return
    }

    const queries = context.get('query_count') || 0

    const rollback = function () {
      handled = true
      context.unset('db')
      Context.log('Rolling back Socket'.red)
      conn.query('ROLLBACK', () => {
        done()
      })
    }

    const commit = () => {
      handled = true

      conn.query('COMMIT', function () {
        context.unset('db')

        Job.handle(context.get('jobs'), err => {
          if (err)
            Context.log('⚠ SOCKET JOB Panic:'.red, err, err.stack)

          Context.log('Socket OK'.green, `Σ${queries}`)
          done()
        })
      })
    }

    const errorHandler = e => {
      delete e.domain
      delete e.domainThrown
      delete e.domainEmitter
      delete e.domainBound

      Context.log('⚠ SOCKET Panic:'.yellow, e, e.stack)

      if (handled)
        return

      rollback()
    }

    context.on('error', async e => {
      context.run(errorHandler, e)
    })

    if (typeof cb === 'function') {
      args[args.length - 1] = function (e) {
        if (e)
          throw e

        commit()
        cb.apply(socket, arguments)
      }
    } else
      args.push((e) => {
        if (e)
          throw e
        commit()
      })

    conn.query('BEGIN', function (err) {
      if (err)
        return fn(Error.Database(err))

      context.set({
        db: conn,
        jobs: [],
        'db:log': true
      })

      args.unshift(socket)

      setImmediate(() => {
        fn.apply(null, args)
      })
    })
  })
}

const transaction = function (fn, socket) {
  return function () {
    const user_name = socket.user ? socket.user.email : 'Guest'
    const id = `${fn.name}-${user_name}-${uuid.v1().substr(0,8)}`
    const context = Context.create({id})

    Context.log('Entering', id)

    context.set({
      user: socket.user,
      function: fn.name,
      socket
    })

    const args = Array.prototype.slice.call(arguments)

    context.run(() => {
      _transaction(fn, socket, args)
    })
  }
}

module.exports = {
  transaction
}
