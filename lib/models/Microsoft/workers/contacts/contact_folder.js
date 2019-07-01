const db = require('../../../../utils/db.js')


const addContactFolder = async (credential, contactFolder) => {
  return db.insert('microsoft/contact_folder/insert', [credential.id, contactFolder.folder_id, contactFolder.parent_folder_id, contactFolder.display_ame])
}

const syncContactFolders = async (microsoft, data) => {
  try {
    const folders = await microsoft.getContactFolders()

    if (!folders.length)
      return { status: true }

    const contactFolders = []

    for (const folder of folders) {
      contactFolders.push({
        folder_id: folder.id,
        parent_folder_id: folder.parentFolderId,
        display_ame: folder.displayName
      })
    }
  
    for (const contactFolder of contactFolders) {
      await addContactFolder(data.microsoftCredential, contactFolder)
    }

    return  {
      status: true
    }

  } catch (ex) {

    let err = { code: ex.statusCode || null, message: ex }

    if ( ex.statusCode === 401 )
      err = { code: ex.statusCode, message: 'invalid_grant' }

    return  {
      status: false,
      ex: err
    }
  }
}

module.exports = {
  syncContactFolders
}