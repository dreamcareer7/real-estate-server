const { getCRMBrandsForUser } = require('./brand')
const { callMethodJson } = require('./slack_web_api')

async function openDialog(user_id, trigger_id) {
  const crm_brands = (await getCRMBrandsForUser(user_id)).map(cb => ({
    value: cb.id,
    label: cb.name
  }))

  return callMethodJson('dialog.open', {
    trigger_id,
    dialog: {
      callback_id: 'open-move-contacts',
      state: user_id,
      title: 'Move Contacts to Another Team',
      submit_label: 'Move!',
      elements: [
        {
          type: 'select',
          label: 'Team',
          name: 'brand',
          options: crm_brands
        }
      ]
    }
  })
}

async function command(user_id, trigger_id) {
  await openDialog(user_id, trigger_id)
}

module.exports = {
  command
}
