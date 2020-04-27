const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const MicrosoftMailFolder = {}



MicrosoftMailFolder.upsertFolders = async (cid, folders) => {
  return db.insert('microsoft/mail_folders/upsert', [cid, JSON.stringify(folders)])
}

MicrosoftMailFolder.getAll = async (ids) => {
  return await db.select('microsoft/mail_folders/get', [ids])
}

MicrosoftMailFolder.get = async (id) => {
  const records = await MicrosoftMailFolder.getAll([id])

  if (records.length < 1)
    return null

  return records[0]
}

MicrosoftMailFolder.getByCredential = async (cid) => {
  const id = db.selectId('microsoft/mail_folders/get_by_credential', [cid])

  if (!id)
    return null

  return MicrosoftMailFolder.get(id)
}



Orm.register('microsoft_mail_folder', 'MicrosoftMailFolder', MicrosoftMailFolder)

module.exports = MicrosoftMailFolder
