#!/usr/bin/env node
const Context   = require('../Context')
const db        = require('../../utils/db')
const debounce  = require('../../utils/debounce')

const GoogleCredential = require('./credential')

const GMAIL_DEBOUNCE_DELAY = 5000


const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client) => {
      if (err)
        return reject(err)

      resolve(client)
    })
  })
}

const handleGmailWebhook = async (key) => {
  const context = Context.create()
  context.set({
    db: await getDb()
  })
  context.enter()

  context.log('--- Starting', key)

  const googleCredentials = await GoogleCredential.getByEmail(key)

  for (const credential of googleCredentials) {
    if ( credential.scope_summary && credential.scope_summary.includes('mail.read') && !credential.revoked && !credential.deleted_at ) {
      try {
        await GoogleCredential.forceSync(credential.id)
        context.log('--- SyncGoogle - Gmail Notif - forceSync', key, credential.id)
      } catch (ex) {
        console.log('---- ex.message', ex.message)
      }
    }
  }

  context.exit()

  return
}


module.exports = debounce(handleGmailWebhook, GMAIL_DEBOUNCE_DELAY)