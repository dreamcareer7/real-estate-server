const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const MicrosoftCalendar      = require('../../../lib/models/Microsoft/calendar')
const MicrosoftCalendarEvent = require('../../../lib/models/Microsoft/calendar_events')

// const { generateCalendarEventRecord } = require('../../../lib/models/Microsoft/workers/calendars/common.js')


const { createMicrosoftMessages } = require('./helper')

let user, brand, googleCredential, googleCalendar