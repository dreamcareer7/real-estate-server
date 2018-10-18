const { NotFound } = require('./errors')

const { getBrandsForUser } = require('./brand')
const { callMethodJson } = require('./slack_web_api')

async function openDialog(user_id, trigger_id) {
  let brands

  try {
    brands = (await getBrandsForUser(user_id)).map(cb => ({
      value: cb.id,
      label: cb.name
    }))
  }
  catch (ex) {
    if (ex instanceof NotFound) {
      return false
    }
   
    throw ex
  }

  return callMethodJson('dialog.open', {
    trigger_id,
    dialog: {
      callback_id: 'open-move-contacts',
      state: user_id,
      title: 'Move Contacts',
      submit_label: 'Move!',
      elements: [
        {
          type: 'select',
          label: 'Team',
          name: 'brand',
          options: brands
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
