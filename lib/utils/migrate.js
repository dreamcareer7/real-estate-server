const fs = require('fs')
const linger = require('linger')
require('colors')

const migrate = require('migratus')({
  loader: loadState,
  saver: saveState,
  directory: __dirname + '/../../migrations'
})

migrate.on('migrate failed', (name, direction, err) => {
  console.log('Failed'.red, 'Reason:'.cyan, err.red)
})

migrate.on('migrate succeeded', (name, direction) => {
  console.log('OK'.green)
})

const db = require('./db.js')

let loadedState

const sql_load = fs.readFileSync(__dirname + '/../sql/migration/load.sql').toString()
const sql_save = fs.readFileSync(__dirname + '/../sql/migration/save.sql').toString()

function saveState (state, cb) {
  db.conn((err, conn) => {
    if (err)
      return cb(err)

    conn.query(sql_save, [JSON.stringify(state)], cb)
  })
}

function loadState (cb) {
  db.conn((err, conn) => {
    if (err)
      return cb(err)

    conn.query(sql_load, (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      loadedState = res.rows[0].state
      if (!Array.isArray(loadedState))
        loadedState = []

      return cb(null, loadedState)
    })
  })
}

function performMigration (cb) {
  migrate.on('migrate started', (name) => {
    linger('Migration ' + name + ' is being applied...')
  })

  migrate.on('migrate failed', linger)
  migrate.on('migrate succeeded', linger)

  migrate.up(err => {
    linger()

    if (err) {
      console.log('Migrations failure:', err)
      process.exit()
      return
    }

    cb()
  })
}

module.exports = performMigration
