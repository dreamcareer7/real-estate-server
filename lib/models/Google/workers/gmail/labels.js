const GoogleMailLabel = require('../../mail_labels')


const listLables = async (google, cid) => {
  const labels = await google.listLabels()
  await GoogleMailLabel.upsertLabels(cid, labels)

  // const systemLabels = labels.filter(l => l.type === 'system').map(l => ({ id: l.id, name: l.name }))
  // const userLabels   = labels.filter(l => l.type === 'user').map(l => ({ id: l.id, name: l.name }))

  const systemLabels = labels.filter(l => l.type === 'system').map(l => l.id)
  const userLabels   = labels.filter(l => l.type === 'user').map(l => l.id)

  return {
    systemLabels,
    userLabels
  }
}

const isArchived = (messageLabeles, labels) => {
  return (messageLabeles.includes('INBOX') || messageLabeles.some(r => labels.userLabels.indexOf(r) >= 0)) ? false : true
}


module.exports = {
  listLables,
  isArchived
}