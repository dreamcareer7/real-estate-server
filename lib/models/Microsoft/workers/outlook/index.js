const folders  = require('./folders')
const messages = require('./messages')
const bounced = require('./bounced')
const contacts = require('./contacts')


module.exports = {
  syncFolders: folders.syncFolders,
  syncMessages: messages.syncMessages,
  syncBouncedMessages: bounced.syncBouncedMessages,
  extractContacts: contacts.extractContacts
}