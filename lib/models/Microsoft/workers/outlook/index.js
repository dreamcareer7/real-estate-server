const folders  = require('./folders')
const messages = require('./messages')
const contacts = require('./contacts')


module.exports = {
  syncFolders: folders.syncFolders,
  syncMessages: messages.syncMessages,
  extractContacts: contacts.extractContacts
}