#!/usr/bin/env node
const Slack    = require('../../models/Slack')
const Context  = require('../Context')
const db       = require('../../utils/db')
const debounce = require('../../utils/debounce')

const GoogleWorker     = require('./workers')
const GoogleCredential = require('./credential')

const GMAIL_DEBOUNCE_DELAY = 5000



const createContext = async c => {
  const context = Context.create({ ...c })

  context.enter()

  const { conn, done } = await db.conn.promise()

  const rollback = err => {
    Context.trace('<- Rolling back on worker'.red, err)

    return conn.query('ROLLBACK', (err) => {
      done(err)
      context.exit()
    })
  }

  const commit = async () => {
    try {
      await conn.query('COMMIT')
    } catch(err) {
      Context.trace('<- Commit failed!'.red)
      rollback(err)
      return
    }

    Context.log('Committed 👌')

    await Job.handleContextJobs() // ????

    done()
    context.exit()
  }

  context.on('error', function (e) {
    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound

    Context.log('⚠ Panic:'.yellow, e, e.stack)
    rollback(e.message)
  })

  await conn.query('BEGIN')

  context.set({
    db: conn,
    jobs: [],
    rabbit_jobs: [],
  })

  return {
    rollback,
    commit
  }
}

const getConnection = async () => {
  try {
    return await createContext({ id: 'debouncer-x' })
  } catch (ex) {
    console.error(ex)
    Slack.send({ channel: '7-server-errors', text: 'debouncer-x db-conn failed!' })
    throw ex
  }
}

const handleGmailWebhook = async (key) => {
  const { commit, rollback } = await getConnection()

  try {
    const result      = await GoogleCredential.getByEmail(key)
    const credentials = result.filter(c => (c.scope_summary && c.scope_summary.includes('mail.read') && !c.revoked && !c.deleted_at))

    for (const credential of credentials) {
      try {
        await GoogleCredential.forceSync(credential.id)
      } catch (ex) {
        // do nothing
      }
    }

    await commit()

  } catch (ex) {
    Slack.send({ channel: '7-server-errors', text: '', emoji: ':skull:' })
    rollback(ex)
    throw ex
  }
}

const handleGmailWebhookAlt = async (key) => {
  GoogleWorker.Gmail.pushEvent({ email: key })
}


module.exports = debounce(handleGmailWebhook, GMAIL_DEBOUNCE_DELAY)
module.exports = debounce(handleGmailWebhookAlt, GMAIL_DEBOUNCE_DELAY)