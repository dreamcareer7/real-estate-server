const MicrosoftContact = require('../../../contact')
const GoogleCredential = {
  ...require('../../../credential/update')
}

const fiveXErr = [500, 501, 502, 503, 504]


const syncContactFolders = async (microsoft, credential) => {
  try {
    const folders        = await microsoft.getContactFolders()
    const offlineFolders = await MicrosoftContact.getCredentialFolders(credential.id)

    if ( !folders.length && offlineFolders.length ) {
      await MicrosoftContact.removeFoldersByCredential(credential.id)
    }

    if (!folders.length) {
      return {
        status: true
      }
    }

    const contactFolders = []

    for (const folder of folders) {
      contactFolders.push({
        folder_id: folder.id,
        parent_folder_id: folder.parentFolderId,
        display_name: folder.displayName
      })
    }
  
    for (const contactFolder of contactFolders) {
      await MicrosoftContact.addContactFolder(credential, contactFolder)
    }


    // if (nextSyncToken) {
    //   await GoogleCredential.updateContactFoldersSyncToken(credential.id, nextSyncToken)
    // }

    return  {
      status: true,
      ex: null
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