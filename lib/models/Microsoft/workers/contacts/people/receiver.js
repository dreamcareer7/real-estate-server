const ContactIntegration = require('../../../../ContactIntegration')



const handleNewRecords = async (microsoftContacts) => {
  const integrationRecords = microsoftContacts.map(mc => (
    {
      microsoft_id: mc.id,
      google_id: null,
      contact: mc.contact,
      origin: 'microsoft',
      etag: mc.etag,
      local_etag: mc.etag      
    }
  ))

  await ContactIntegration.insert(integrationRecords)
}

const handleToUpdateRecords = async (microsoftContacts) => {
  const integrationRecords = microsoftContacts.map(mc => (
    {
      microsoft_id: mc.id,
      google_id: null,
      contact: mc.contact,
      origin: 'microsoft',
      etag: mc.etag,
      local_etag: mc.etag      
    }
  ))
  
  await ContactIntegration.mupsert(integrationRecords)


  // This is a temporary hack to handle already synced outlook_contacts that do not have any relevant contact_integration record.
  // We can delete this part later
  const microsoftIds       = integrationRecords.map(r => r.microsoft_id)
  const alreadyCreated     = await ContactIntegration.getByMicrosoftIds(microsoftIds)
  const alreadyCreatedMIds = alreadyCreated.map(r => r.microsoft_id)
  const toCreateRecords    = integrationRecords.filter(r => !alreadyCreatedMIds.includes(r.microsoft_id))
  await ContactIntegration.insert(toCreateRecords)
}


module.exports = {
  handleNewRecords,
  handleToUpdateRecords
}