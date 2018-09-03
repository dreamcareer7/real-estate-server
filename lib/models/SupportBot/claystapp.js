const { callMethodJson } = require('./slack_web_api')

const CS_PARENT_BRAND = '745e77aa-4ddf-11e6-a07d-f23c91b0d077'

async function openDialog(trigger_id) {
  return callMethodJson('dialog.open', {
    trigger_id,
    dialog: {
      callback_id: 'ryde-46e2b0',
      title: 'Setup ClayStapp Team',
      submit_label: 'Setup!',
      elements: [
        {
          type: 'text',
          label: 'Team name',
          name: 'brand_name'
        },
        {
          type: 'text',
          label: 'Email',
          name: 'email'
        },
        {
          type: 'text',
          label: 'Domain',
          name: 'domain'
        }
      ]
    }
  })
}

async function command(trigger_id) {
  await openDialog(trigger_id)
}

module.exports = {
  command
}