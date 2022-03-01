const MicrosoftContact = require('../../../contact')
const MicrosoftCredential = {
  ...require('../../../credential/update')
}
const MicrosoftContactPeople = require('../people')

const fiveXErr = [500, 501, 502, 503, 504]


const syncContactFolders = async (microsoft, credential) => {
  try {
    const { values: folders, delta } = await microsoft.syncContactFolders(credential.cfolders_sync_token)

    const deleted   = folders.filter(f => f['@removed'])
    const confirmed = folders.filter(f => !f['@removed'])

    const contactFolders = confirmed.map(folder => {
      return {
        microsoft_credential: credential.id,
        folder_id: folder.id,
        parent_folder_id: folder.parentFolderId,
        display_name: folder.displayName
      }
    })

    const deletedFolders = deleted.map(folder => {
      return {
        microsoft_credential: credential.id,
        folder_id: folder.id
      }
    })

    // Need this line for tag issue
    // const upsertedFolders =  await MicrosoftContact.addContactFolders(contactFolders)
    await MicrosoftContact.addContactFolders(contactFolders)
    await MicrosoftContact.deleteManyCFolders(deletedFolders)
    let contactIds = await MicrosoftContact.getByParentFolderId(credential.id, deletedFolders.map(x => x.folder_id))
    contactIds = contactIds.map((x) => {
      return { id: x.remote_id }
    })
    // Context.log('syncContacts [Microsoft To Rechat] - deletedFolders', JSON.stringify( deletedFolders.map(x => x.folder_id)))
    // Context.log('syncContacts [Microsoft To Rechat] - contactsInDeletedFolders', JSON.stringify(contactIds))
    await MicrosoftContactPeople.processDeleted(credential, contactIds)

    if (delta) {
      await MicrosoftCredential.updateContactFoldersSyncToken(credential.id, delta)
    }

    return  {
      status: true
    }

  } catch (ex) {

    if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  syncContactFolders
}