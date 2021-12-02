const { SELLING, BUYING, OFFER } = require('../checklist/constants')

const SALE = 'Sale'
const LEASE = 'Lease'

const Buyer = {
  title: 'Buyer',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE]
}


const BuyerAgent = {
  title: 'Buyer Agent',
  checklist_types: [OFFER, BUYING],
  lease: true,
  sale: true,
  transaction_type: [SALE, LEASE]
}

const CoBuyerAgent = {
  title: 'Co Buyer Agent',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE, LEASE]
}

const BuyerPowerOfAttorney = {
  title: 'Buyer Power Of Attorney',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE]
}

const BuyerLawyer = {
  title: 'Buyer Lawyer',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE]
}

const BuyerReferral = {
  title: 'Buyer Referral',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE]
}

const BuyerBroker = {
  title: 'Buyer Broker',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE, LEASE]
}

const Seller = {
  title: 'Seller',
  checklist_types: [SELLING],
  transaction_type: [SALE]
}


const SellerAgent = {
  title: 'Seller Agent',
  checklist_types: [SELLING],
  transaction_type: [SALE, LEASE]
}

const CoSellerAgent = {
  title: 'Co Seller Agent',
  checklist_types: [SELLING],
  transaction_type: [SALE, LEASE]
}

const SellerPowerOfAttorney = {
  title: 'Seller PowerOf Attorney',
  checklist_types: [SELLING],
  transaction_type: [SALE]
}

const SellerLawyer = {
  title: 'Seller Lawyer',
  checklist_types: [SELLING],
  transaction_type: [SALE]
}

const SellerReferral = {
  title: 'Seller Referral',
  checklist_types: [SELLING],
  transaction_type: [SALE]
}

const SellerBroker = {
  title: 'Seller Broker',
  checklist_types: [SELLING],
  transaction_type: [SALE, LEASE]
}

const Title = {
  title: 'Escrow Officer',
  checklist_types: [OFFER, BUYING],
  transaction_type: [SALE]
}

const Tenant = {
  title: 'Tenant',
  checklist_types: [OFFER, BUYING],
  transaction_type: [LEASE]
}

const TenantPowerOfAttorney = {
  title: 'Tenant Power Of Attorney',
  checklist_types: [OFFER, BUYING],
  transaction_type: [LEASE]
}

const Landlord = {
  title: 'Landlord',
  checklist_types: [SELLING],
  transaction_type: [LEASE]
}

const LandlordPowerOfAttorney = {
  title: 'Landlord Power Of Attorney',
  checklist_types: [SELLING],
  transaction_type: [LEASE]
}

const definitions = {
  Buyer,
  BuyerAgent,
  CoBuyerAgent,
  BuyerPowerOfAttorney,
  BuyerLawyer,
  BuyerReferral,
  BuyerBroker,


  Seller,
  SellerAgent,
  CoSellerAgent,
  SellerPowerOfAttorney,
  SellerLawyer,
  SellerReferral,	
  SellerBroker,

  Title,

  Tenant,
  TenantPowerOfAttorney,

  Landlord,
  LandlordPowerOfAttorney
}

Object.keys(definitions).forEach(role => {
  const definition = definitions[role]

  definition.role = role
  definition.type = 'deal_role_definition'
})

module.exports = definitions