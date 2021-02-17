const MicrosoftContact = require('../../../contact')
const MicrosoftCredential = {
  ...require('../../../credential/update')
}

const fiveXErr = [500, 501, 502, 503, 504]


const syncContactFolders = async (microsoft, credential) => {
  try {
    const { folders, next: token } = await microsoft.syncContactFolders(credential.cfolders_sync_token)

    if (!folders.length) {
      return {
        status: true
      }
    }

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

    await MicrosoftContact.addContactFolders(contactFolders)
    await MicrosoftContact.deleteManyCFolders(deletedFolders)

    if (token) {
      await MicrosoftCredential.updateContactFoldersSyncToken(credential.id, token)
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