const { configureCalendars } = require('../../lib/models/Microsoft/calendar/upsert')
const Credential = require('../../lib/models/Microsoft/credential/get')
const getClient = require('../../lib/models/Microsoft/client')

const { program } = require('commander')

program.option('-c, --credential <cred>')

program.parse()

const options = program.opts()

async function main() {
  const cred = await Credential.get(options.cred)
  const microsoft = await getClient(cred.id, 'calendar')
  const calendars = await microsoft.listCalendars()
  const toStopSync = calendars
    .filter((c) => !c.name || !c.name.includes('Rechat'))
    .map((c) => c.id)

  await configureCalendars(cred, { toSync: [], toStopSync })
}

main().catch(ex => console.error(ex))
