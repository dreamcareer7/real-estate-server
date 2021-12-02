const { SELLING, BUYING, OFFER } = require('../checklist/constants')

const SALE = 'Sale'
const LEASE = 'Lease'

const Buyer = {
	title:  'Buyer',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE]
}


const BuyerAgent = {
	title:  'Buyer Agent',
	property_types: [OFFER, BUYING],
	lease: true,
	sale: true,
	transaction_type: [SALE, LEASE]
}

const CoBuyerAgent = {
	title:  'Co Buyer Agent',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE, LEASE]
}

const BuyerPowerOfAttorney = {
	title:  'Buyer Power Of Attorney',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE]
}

const BuyerLawyer = {
	title:  'Buyer Lawyer',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE]
}

const BuyerReferral = {
	title:  'Buyer Referral',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE]
}

const BuyerBroker = {
	title:  'Buyer Broker',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE, LEASE]
}

const Seller = {
	title:  'Seller',
	property_types: [SELLING],
	transaction_type: [SALE]
}


const SellerAgent = {
	title:  'Seller Agent',
	property_types: [SELLING],
	transaction_type: [SALE, LEASE]
}

const CoSellerAgent = {
	title:  'Co Seller Agent',
	property_types: [SELLING],
	transaction_type: [SALE, LEASE]
}

const SellerPowerOfAttorney = {
	title:  'Seller PowerOf Attorney',
	property_types: [SELLING],
	transaction_type: [SALE]
}

const SellerLawyer = {
	title:  'Seller Lawyer',
	property_types: [SELLING],
	transaction_type: [SALE]
}

const SellerReferral = {
	title:  'Seller Referral',
	property_types: [SELLING],
	transaction_type: [SALE]
}

const SellerBroker = {
	title:  'Seller Broker',
	property_types: [SELLING],
	transaction_type: [SALE, LEASE]
}

const Title = {
	title:  'Escrow Officer',
	property_types: [OFFER, BUYING],
	transaction_type: [SALE]
}

const Tenant = {
	title:  'Tenant',
	property_types: [OFFER, BUYING],
	transaction_type: [LEASE]
}

const TenantPowerOfAttorney = {
	title:  'Tenant Power Of Attorney',
	property_types: [OFFER, BUYING],
	transaction_type: [LEASE]
}

const Landlord = {
	title:  'Landlord',
	property_types: [SELLING],
	transaction_type: [LEASE]
}

const LandlordPowerOfAttorney = {
	title:  'Landlord Power Of Attorney',
	property_types: [SELLING],
	transaction_type: [LEASE]
}

module.exports = {
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
