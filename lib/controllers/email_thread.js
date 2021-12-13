const am          = require('../utils/async_middleware.js')
const Brand       = require('../models/Brand')
const EmailThread = require('../models/Email/thread')
const UsersJob    = require('../models/UsersJob')

const GoogleCredential    = require('../models/Google/credential')
const GoogleMessage       = require('../models/Google/message')
const MicrosoftCredential = require('../models/Microsoft/credential')
const MicrosoftMessage    = require('../models/Microsoft/message')

const { deleteGmailThreads, deleteGmailMessages, updateGmailThreads, updateGmailMessages, archiveGmailThreads, archiveGmailMessages } = require('../models/Email/senders/gmail')
const { deleteOutlookThreads, deleteOutlookMessages, UpdateOutlookThreads, updateOutlookMessages, archiveOutlookThreads, archiveOutlookMessages } = require('../models/Email/senders/outlook')

const googleCommon    = require('../models/Google/common')
const microsoftCommon = require('../models/Microsoft/common')

const sendSlackMessage = googleCommon.sendSlackMessage



function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}


const insertGmailQueryJob = async (credential, jobName, metadata) => {
  const userJob = await UsersJob.find({ gcid: credential.id, mcid: null, jobName, metadata })

  const status = 'waiting'
  const recurrence = false

  if (!userJob) {
    await UsersJob.upsertByGoogleCredential(credential, jobName, status, metadata, recurrence)
  }
}

const insertOutlookQueryJob = async (credential, jobName, metadata) => {
  const userJob = await UsersJob.find({ gcid: null, mcid: credential.id, jobName, metadata })

  const status = 'waiting'
  const recurrence = false

  if (!userJob) {
    await UsersJob.upsertByMicrosoftCredential(credential, jobName, status, metadata, recurrence)
  }
}


const listThreads = async(req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const is_read = (req.query.is_read === 'true' ? true : (req.query.is_read === 'false' ? false : undefined))
  const has_attachments = (req.query.has_attachments === 'true' ? true : (req.query.has_attachments === 'false' ? false : undefined))
  const start = req.query.start ? parseInt(req.query.start) : 0
  const limit = req.query.limit ? parseInt(req.query.limit) : 50
  const query = req.query.q ? req.query.q : req.body.q

  const filtered_ids = Array.isArray(req.query.ids)
    ? req.query.ids
    : (Array.isArray(req.body.ids)
      ? req.query.ids
      : null)

  const q = { start, limit, ids: filtered_ids, q: query, next: req.body.next || {} }
  if (is_read !== undefined) q.is_read = is_read
  if (has_attachments !== undefined) q.has_attachments = has_attachments

  const { ids, total, next } = await EmailThread.filter(user, brand, q)
  const threads = await EmailThread.getAll(ids)

  /* Some email threads after delete may appears here and produce some bugs. 
  * We need to remove that specefic thread in threads array which its messages is equl to `null`. 
  * We iterate over the threads array for any `null` messages and remvove it.
  * Have look at: https://gitlab.com/rechat/server/-/issues/1913
  */
  const filteredThreads = threads.filter(x => Boolean(x.messages))

  if (filteredThreads.length > 0) {
    filteredThreads[0].total = total
  }

  return res.collection(filteredThreads, { next })
}

const syncThreads = async (req, res) => {
  const contact_address = req.body.contact_address

  if (!contact_address) {
    throw Error.BadRequest('Contact\' email address is not specified!')
  }

  const brand = getCurrentBrand()
  const user  = req.user.id

  const gcredentials = await GoogleCredential.getByUser(user, brand)
  const mcredentials = await MicrosoftCredential.getByUser(user, brand)

  const promises = []

  const gmailJobName   = 'gmail_query'
  const outlookJobName = 'outlook_query'

  for ( const cred of gcredentials ) {
    promises.push(insertGmailQueryJob(cred, gmailJobName, { contact_address }))
  }

  for ( const cred of mcredentials ) {
    promises.push(insertOutlookQueryJob(cred, outlookJobName, { contact_address }))
  }

  await Promise.all(promises)

  return res.status(200).end()
}

const getThread = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const thread = await EmailThread.get(req.params.id)

  const authorized = await EmailThread.hasAccess(thread, user, brand)
  if (!authorized)
    throw Error.BadRequest('Access denied to this thread.')

  return res.model(thread)
}


const validateAccess = async (gids, mids, user, brand) => {
  const gCredentials = await GoogleCredential.getAll(gids)
  const mCredentials = await MicrosoftCredential.getAll(mids)

  gCredentials.forEach(credential => {
    googleCommon.checkModifyAccess(credential, user, brand)
  })

  mCredentials.forEach(credential => {
    microsoftCommon.checkModifyAccess(credential, user, brand)
  })

  return {
    gCredentials,
    mCredentials
  }
}

const checkThreads = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.body.thread_keys) {
    throw Error.Validation('Thread_keys must be specified!')
  }

  if (!Array.isArray(req.body.thread_keys)) {
    throw Error.BadRequest('Thread_keys is not Array!')
  }

  const threadKeys = req.body.thread_keys

  if ( threadKeys.length === 0 ) {
    return res.status(202).end()
  }

  const gCredentialIds = await GoogleMessage.getDistinctCredentialByThread(threadKeys)
  const mCredentialIds = await MicrosoftMessage.getDistinctCredentialByThread(threadKeys)

  const { gCredentials, mCredentials } = await validateAccess(gCredentialIds, mCredentialIds, user, brand)

  return {
    gCredentials,
    mCredentials,
    threadKeys
  }
}

const checkMessages = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.body.message_ids) {
    throw Error.Validation('Message_ids must be specified!')
  }

  if (!Array.isArray(req.body.message_ids)) {
    throw Error.BadRequest('Message_ids is not Array!')
  }

  const messageIds = req.body.message_ids

  if ( messageIds.length === 0 ) {
    return res.status(202).end()
  }

  const gCredentialIds = await GoogleMessage.getDistinctCredentialByMessage(messageIds)
  const mCredentialIds = await MicrosoftMessage.getDistinctCredentialByMessage(messageIds)

  const { gCredentials, mCredentials } = await validateAccess(gCredentialIds, mCredentialIds, user, brand)

  return {
    gCredentials,
    mCredentials,
    messageIds
  }
}

const deleteThreads = async (req, res) => {
  const { gCredentials, mCredentials, threadKeys } = await checkThreads(req, res)

  try {
    await deleteGmailThreads(gCredentials, threadKeys)
    await deleteOutlookThreads(mCredentials, threadKeys)
  } catch (ex) {
    sendSlackMessage(`Threads-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const deleteMessages = async (req, res) => {
  const { gCredentials, mCredentials, messageIds } = await checkMessages(req, res)

  try {
    await deleteGmailMessages(gCredentials, messageIds)
    await deleteOutlookMessages(mCredentials, messageIds)
  } catch (ex) {
    sendSlackMessage(`Messages-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const updateThreadsStatus = async (req, res) => {
  const { gCredentials, mCredentials, threadKeys } = await checkThreads(req, res)

  const status = Boolean(req.body.is_read)

  try {
    await updateGmailThreads(gCredentials, threadKeys, status)
    await UpdateOutlookThreads(mCredentials, threadKeys, status)
  } catch (ex) {
    sendSlackMessage(`Threads-Update-Status-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const updateMessagesStatus = async (req, res) => {
  const { gCredentials, mCredentials, messageIds } = await checkMessages(req, res)

  const status = Boolean(req.body.is_read)

  try {
    await updateGmailMessages(gCredentials, messageIds, status)
    await updateOutlookMessages(mCredentials, messageIds, status)
  } catch (ex) {
    sendSlackMessage(`Messages-Update-Status-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const archiveThreads = async (req, res) => {
  const { gCredentials, mCredentials, threadKeys } = await checkThreads(req, res)

  try {
    await archiveGmailThreads(gCredentials, threadKeys)
    await archiveOutlookThreads(mCredentials, threadKeys)
  } catch (ex) {
    sendSlackMessage(`Threads-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const archiveMessages = async (req, res) => {
  const { gCredentials, mCredentials, messageIds } = await checkMessages(req, res)

  try {
    await archiveGmailMessages(gCredentials, messageIds)
    await archiveOutlookMessages(mCredentials, messageIds)
  } catch (ex) {
    sendSlackMessage(`Messages-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/threads', auth, brandAccess, am(listThreads))
  app.post('/emails/threads', auth, brandAccess, am(syncThreads))
  app.post('/emails/threads/filter', auth, brandAccess, am(listThreads))
  app.get('/emails/threads/:id', auth, brandAccess, am(getThread))

  app.delete('/emails/threads/trash', auth, brandAccess, am(deleteThreads))
  app.delete('/emails/messages/trash', auth, brandAccess, am(deleteMessages))

  app.put('/emails/threads/status', auth, brandAccess, am(updateThreadsStatus))
  app.put('/emails/messages/status', auth, brandAccess, am(updateMessagesStatus))

  app.put('/emails/threads/archive', auth, brandAccess, am(archiveThreads))
  app.put('/emails/messages/archive', auth, brandAccess, am(archiveMessages))
}

module.exports = router
