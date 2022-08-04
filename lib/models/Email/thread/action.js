const _ = require('lodash')

const db = require('../../../utils/db.js')

const Socket  = require('../../Socket')
const Context = require('../../Context/index.js')
const emitter = require('./emitter')

const { getCredential } = require('./filter')



function sendSocketEvent(event, user, args) {
  Context.log(`>>> (Socket) Sending ${event} event to user ${user}`)
  Socket.send(
    event,
    user,
    [args],

    (err) => {
      if (err)
        Context.error('>>> (Socket) Error sending thread prune socket event.', err)
    }
  )
}


/**
 * @param {string} thread
 * @param {UUID} user
 * @param {UUID} brand
 */
const hasAccess = async (thread, user, brand) => {
  const credential = await getCredential(thread)
  return credential.user === user && credential.brand === brand
}

/**
 * @param {string[]} ids
 * @param {UUID} microsoft_credential
 */
const updateMicrosoft = async (ids, microsoft_credential, { event }) => {
  ids = await db.selectIds('email/thread/update_microsoft', [ids])
  const credential = await getCredential({ microsoft_credential })

  sendSocketEvent('email_thread:update', credential.user, {
    microsoft_credential,
    threads: _.uniq(ids).slice(0, 50)
  })

  emitter.emit('update', {
    microsoft_credential,
    threads: _.uniq(ids),
    brand: credential.brand,
    event
  })
}

/**
 * @param {string[]} ids
 * @param {UUID} google_credential
 */
const updateGoogle = async (ids, google_credential, { event }) => {
  ids = await db.selectIds('email/thread/update_google', [ids])
  const credential = await getCredential({ google_credential })

  if (ids.length > 0) {
    sendSocketEvent('email_thread:update', credential.user, {
      google_credential,
      threads: _.uniq(ids).slice(0, 50)
    })

    emitter.emit('update', {
      google_credential,
      threads: _.uniq(ids),
      brand: credential.brand,
      event
    })
  }
}

/**
 * @param {string[]} ids
 * @param { { google_credential?: UUID; microsoft_credential?: UUID; } } credentials
 */
const prune = async (ids, credentials) => {
  const deleted_ids = await db.selectIds('email/thread/prune', [ids, credentials.google_credential, credentials.microsoft_credential])
  const credential = await getCredential(credentials)

  if (deleted_ids.length > 0) {
    sendSocketEvent('email_thread:delete', credential.user, {
      ...credentials,
      threads: _.uniq(deleted_ids).slice(0, 50)
    })

    emitter.emit('prune', {
      ...credentials,
      brand: credential.brand,
      threads: _.uniq(deleted_ids)
    })
  }
}


module.exports = {
  hasAccess,
  updateMicrosoft,
  updateGoogle,
  prune,
}
