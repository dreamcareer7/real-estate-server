const MicrosoftContact = require('../../contact')


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
        display_name: folder.displayName
      })
    }
  
    for (const contactFolder of contactFolders) {
      await MicrosoftContact.addContactFolder(data.microsoftCredential, contactFolder)
    }

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

module.exports = {
  syncContactFolders
}