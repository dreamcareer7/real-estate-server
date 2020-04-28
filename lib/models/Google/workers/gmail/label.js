const GoogleMailLabel = require('../../mail_labels')


const syncLabels = async (google, data) => {
  const labels = await google.listLabels()

  return await GoogleMailLabel.upsertLabels(data.googleCredential.id, labels)
}

const listLabels = async (cid) => {
  let systemLabels = []
  let userLabels = []

  const result = await GoogleMailLabel.getByCredential(cid)

  // const systemLabels = labels.filter(l => l.type === 'system').map(l => ({ id: l.id, name: l.name }))
  // const userLabels   = labels.filter(l => l.type === 'user').map(l => ({ id: l.id, name: l.name }))

  if(!result) {
    return {
      systemLabels,
      userLabels
    }
  }

  systemLabels = result.labels.filter(l => l.type === 'system').map(l => l.id)
  userLabels   = result.labels.filter(l => l.type === 'user').map(l => l.id)

  return {
    systemLabels,
    userLabels
  }
}


module.exports = {
  syncLabels,
  listLabels  
}