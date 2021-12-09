const request = require('request-promise-native')
const moment = require('moment')
const _ = require('lodash')

const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

const Context = require('../../Context')

const BrandPropertyType = require('../../Brand/deal/property_type/get')
const DealRole = require('../role/get')
const Deal = {
  ...require('../context/get'),
  ...require('../constants'),
}

const Brand = {
  ...require('../../Brand/get'),
  ...require('../../Brand/constants')
}

const BrandStatus = require('../../Brand/deal/status/get')

const getState = async deal => {
  const { rows } = await db.executeSql.promise('SELECT * FROM de.deals WHERE deal = $1', [deal])
  const [ row ] = rows
  return row
}

const isReferral = role => {
  return role.role === 'BuyerReferral' || role.role === 'SellerReferral'
}

const getToken = async () => {
  const uri = 'https://webapi.elliman.com/token?username=emil@rechat.com&password=Skiing4-Monetize-Excitable'

  const { token } = await request({
    uri,
    json: true
  })

  return token
}

const getRoleCommission = (deal, role) => {
  if (role.commission_dollar !== null) {
    return {
      PercentOrAmount: 'Amount',
      Share: role.commission_dollar || 0
    }
  }

  return {
    PercentOrAmount: 'Percent',
    Share: role.commission_percentage || 0
  }
}

const getCommissionValue = (deal, role) => {
  if (role.commission_dollar !== null)
    return role.commission_dollar


  const sales_price = Deal.getContext(deal, 'sales_price')
  return sales_price * (role.commission_percentage / 100)
}

const getCommissionRate = (deal, role) => {
  if (role.commission_percentage !== null)
    return role.commission_percentage


  const sales_price = Deal.getContext(deal, 'sales_price')
  return (role.commission_dollar / sales_price) * 100
}

const save = async ({deal, is_finalized = false}) => {
  return db.executeSql.promise(`INSERT INTO de.deals(deal, is_finalized) 
    VALUES ($1, $2)
    ON CONFLICT (deal) 
    DO UPDATE SET is_finalized = EXCLUDED.is_finalized, updated_at = NOW()`, [
    deal.id,
    is_finalized
  ])
}

const getRegionDetails = async brand => {
  const { rows } = await db.executeSql.promise('SELECT * FROM de.regions WHERE brand = $1', [brand.id])
  return rows[0]
}

const getOfficeDetails = async brand => {
  const { rows } = await db.executeSql.promise('SELECT * FROM de.offices WHERE brand = $1', [brand.id])
  return rows[0]
}

const getAgentDetails = async role_ids => {
  const { rows } = await db.executeSql.promise(`SELECT
      deals_roles.id,
      public.users.id as user, 
      de.users.object->>'d365AgentId' as "AgentId", 
      de.users.object->'offices'->0->'businessLocations'->0->>'businessLocation' as "BusinessLocation"
    FROM deals_roles
    LEFT JOIN public.users ON LOWER(deals_roles.email) = LOWER(public.users.email)
    LEFT JOIN de.users ON de.users.user = public.users.id
    WHERE deals_roles.id = ANY($1::uuid[])`, [role_ids])
  return rows
}

const getLeaseAttributes = ({deal, roles}) => {
  const lease_begin = Deal.getContext(deal, 'lease_begin')
  const lease_end = Deal.getContext(deal, 'lease_end')

  const LeaseStartDate = lease_begin ? moment(lease_begin).format('YYYY-MM-DD') : null
  const LeaseEndDate = lease_end ? moment(lease_end).format('YYYY-MM-DD') : null

  const contract_date = Deal.getContext(deal, 'lease_executed')
  const ContractDate = contract_date ? moment(contract_date).format('YYYY-MM-DD') : null

  const MonthlyRent = Deal.getContext(deal, 'leased_price')
  const ListingPrice = Deal.getContext(deal, 'lease_price')

  const RenterName = _.chain(roles)
    .filter({
      role: 'Tenant'
    })
    .map('legal_full_name')
    .value()
    .join(' & ')

  const LandlordrName = _.chain(roles)
    .filter({
      role: 'Landlord'
    })
    .map('legal_full_name')
    .value()
    .join('& ')

  return {
    ContractDate,

    LeaseStartDate,
    LeaseEndDate,

    MonthlyRent,
    ListingPrice,

    LandlordrName,
    RenterName,

    DealType: 'Rentals'
  }
}

const getSaleAttributes = ({deal, roles}) => {
  let ListSideSalesPrice, BuySideSalesPrice
  let ListSideDealValue, BuySideDealValue
  let ListSideCommissionRate, BuySideCommissionRate

  const contract_date = Deal.getContext(deal, 'contract_date')
  const ContractDate = contract_date ? moment(contract_date).format('YYYY-MM-DD') : null

  const isSellside = role => role.role === 'SellerAgent' || role.role === 'CoSellerAgent'
  const isBuyside = role => role.role === 'BuyerAgent' || role.role === 'CoBuyerAgent'

  const sum = (s, n) => s + n

  if (deal.side === Deal.SELLING) {
    ListSideSalesPrice = Deal.getContext(deal, 'sales_price')

    ListSideDealValue = _.chain(roles)
      .filter(isSellside)
      .map(r => getCommissionValue(deal, r))
      .reduce(sum)
      .value()

    ListSideCommissionRate = _.chain(roles)
      .filter(isSellside)
      .map(r => getCommissionRate(deal, r))
      .reduce(sum)
      .value()
  } else {
    BuySideSalesPrice = Deal.getContext(deal, 'sales_price')

    BuySideDealValue = _.chain(roles)
      .filter(isBuyside)
      .map(r => getCommissionValue(deal, r))
      .reduce(sum)
      .value()


    BuySideCommissionRate = _.chain(roles)
      .filter(isBuyside)
      .map(r => getCommissionRate(deal, r))
      .reduce(sum)
      .value()
  }

  const BuyerName = _.chain(roles)
    .filter({
      role: 'Buyer'
    })
    .map('legal_full_name')
    .value()
    .join('& ')

  const SellerName = _.chain(roles)
    .filter({
      role: 'Seller'
    })
    .map('legal_full_name')
    .value()
    .join('& ')

  return {
    ContractDate,

    ListSideSalesPrice,
    BuySideSalesPrice,
    ListSideDealValue,
    BuySideDealValue,
    ListSideCommissionRate,
    BuySideCommissionRate,

    BuyerName,
    SellerName,

    DealType: 'Sales'
  }
}

const sync = async (deal, brand_ids) => {
  Context.log('Syncing D365 for', deal.id)

  const token = await getToken()

  const state = await getState(deal.id)

  const brands = await Brand.getAll(brand_ids)

  const region = _.find(brands, {brand_type: Brand.REGION})
  const office = _.find(brands, {brand_type: Brand.OFFICE})

  const property_type = await BrandPropertyType.get(deal.property_type)

  const roles = await DealRole.getAll(deal.roles)

  const type = property_type.is_lease ? 'rental' : 'sale'
  const update = state ? '/update' : ''
  const uri = `https://webapi.elliman.com/api/adc/postdeal/${type}${update}`
  const created_at = state ? state.created_at : new Date()
  const DealDate = moment(created_at).format('YYYY-MM-DD')

  const ListingId = Deal.getContext(deal, 'mls_number') ?? `Hippocket-${deal.number}`
  const Street = Deal.getContext(deal, 'street_address')
  const ZipCode = Deal.getContext(deal, 'postal_code')
  const PropertyType = property_type.label
  const ListingDate = Deal.getContext(deal, 'list_date')
  const ListingPrice = Deal.getContext(deal, 'list_price')
  const UnitNum = Deal.getContext(deal, 'unit_number')
  const City = Deal.getContext(deal, 'city')
  const State = Deal.getContext(deal, 'state_code')

  const closing_date = Deal.getContext(deal, 'closing_date')
  const ClosingDate = closing_date ? moment(closing_date).format('YYYY-MM-DD') : null

  let DealSide = deal.side === Deal.SELLING ? 'List' : 'Buy'

  const ender_type = Deal.getContext(deal, 'ender_type')
  if (ender_type === Deal.AGENT_DOUBLE_ENDER || ender_type === Deal.OFFICE_DOUBLE_ENDER)
    DealSide = 'Both'


  const leaseAttributes = property_type.is_lease ? getLeaseAttributes({deal, roles}) : {}
  const saleAttributes = !property_type.is_lease ? getSaleAttributes({deal, roles}) : {}

  const isAgent = role => {
    return [
      'SellerAgent',
      'CoSellerAgent',
      'SellerReferral',

      'BuyerAgent',
      'CoBuyerAgent',
      'BuyerReferral',
    ].includes(role.role)
  }

  const role_ids = _.map(roles, 'id')

  const agent_details = await getAgentDetails(role_ids)
  const region_details = await getRegionDetails(region)
  const office_details = await getOfficeDetails(office)

  const isInternal = role => {
    const details = _.find(agent_details, {id: role.id})
    return Boolean(details.AgentId)
  }

  const getDealSide = role => {
    return (role.role === 'SellerAgent' || role.role === 'CoSellerAgent') ? 'List' : 'Buy'
  }

  const mapInternal = role => {
    const AgentType = (role.role === 'BuyerReferral' || role.role === 'AgentReferral') ? 'AgentReferral' : 'Primary'

    if (!AgentType)
      return

    const details = _.find(agent_details, {id: role.id})

    const { AgentId, BusinessLocation } = details

    return  {
      AgentType,
      AgentId,
      BusinessLocation,
      'OfficeGCIAllocation': 100,
      CompanyName: role.company_title,
      DealSide: getDealSide(role),
      ...getRoleCommission(deal, role)
    }
  }

  const mapExternal = role => {
    const AgentType = isReferral(role) ? 'Referral' : 'ReferralAgent'
    const Feebase = isReferral(role) ? 'Off_the_top' : null

    return {
      AgentType,
      DealSide: getDealSide(role),
      PayTo: 'Vendor',
      VendorName: role.legal_full_name,
      CompanyName: role.company_title,
      ...getRoleCommission(deal, role),
      Feebase
    }
  }

  const agents = _.chain(roles)
    .filter(isAgent)
    .map(role => isInternal(role) ? mapInternal(role) : mapExternal(role))
    .value()

  const body = {
    listing: {
      ListingId,
      Street,
      ZipCode,
      PropertyType,
      ListingDate,
      ListingPrice,
      UnitNum,
      City,
      State,
      ListingType: 'Other',
      BusinessLocation: office_details.business_locations[0]
    },
    deal: {
      Source: 'StudioPro',
      DealUniqueRef: `SP${deal.number}`,
      DealSide,
      'LineOfBusiness': 'Brokerage',
      ClosingDate,
      DealDate,
      PaidBy: region_details.paid_by,


      ...leaseAttributes,
      ...saleAttributes,
    },
    agents
  }

  const res = await request({
    uri,
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true,
    method: 'post',
    body
  })

  Context.log(res)

  await save({deal})
}

const queue = peanar.job({
  handler: sync,
  queue: 'd365',
  exchange: 'd365',
  error_exchange: 'd365.error',
  retry_exchange: 'd365.retry',
  max_retries: 10,
  name: 'sync_d365',
  retry_delay: 600000
})


const considerSync = async (deal, brand_ids) => {
  Context.log('Considering D365 sync for', deal.id)

  if (!brand_ids.includes('a1daa4ea-6fb4-4a6f-81a4-5fe9ea7f6e83'))
    return

  const contract_status = Deal.getContext(deal, 'contract_status')
  if (!contract_status)
    return

  const state = await getState(deal.id)
  if (state?.is_finalized)
    return

  const statuses = await BrandStatus.getByBrand(deal.brand)

  const status = _.find(statuses, {label: contract_status})
  if (!status.is_closed)
    return

  Context.log('Queueing D365 sync for', deal.id)
  await queue(deal, brand_ids)
}

module.exports = {
  considerSync,
  sync
}