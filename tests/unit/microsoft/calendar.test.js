const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const MicrosoftCalendar   = require('../../../lib/models/Microsoft/calendar')

const { createMicrosoftMessages } = require('./helper')

let user, brand, googleCredential