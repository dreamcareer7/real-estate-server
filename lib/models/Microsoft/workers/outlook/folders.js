const Context = require('../../../Context')

const MicrosoftMailFolder = require('../../mail_folders')



const listFolders = async (microsoft) => {
  const { vBeta, vOne } = await microsoft.listFolders()

  if (vBeta.error) {
    Context.log('SyncOutlookMessages - ListFolders - V.Beta Failed', vBeta.error.message)
  }

  if (vOne.error) {
    Context.log('SyncOutlookMessages - ListFolders - V.One Failed', vOne.error.message)
  }

  Context.log('SyncOutlookMessages - ListFolders - Done')

  return {
    vBeta: vBeta.folders,
    vOne: vOne.folders
  }
}

const syncFolders = async (microsoft, credential) => {
  const fobj = await listFolders(microsoft)

  return await MicrosoftMailFolder.upsertFolders(credential.id, fobj)
}


module.exports = {
  syncFolders
}