const Buyer = {
	title:  'Buyer',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: false,
	sale: true
}


const BuyerAgent = {
	title:  'Buyer Agent',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: true
}

const CoBuyerAgent = {
	title:  'Co Buyer Agent',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: true
}

const BuyerPowerOfAttorney = {
	title:  'Buyer Power Of Attorney',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: false,
	sale: true
}

const BuyerLawyer = {
	title:  'Buyer Lawyer',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: false,
	sale: true
}

const BuyerReferral = {
	title:  'Buyer Referral',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: false,
	sale: true
}

const BuyerBroker = {
	title:  'Buyer Broker',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: true
}

const Seller = {
	title:  'Seller',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: false,
	sale: true
}


const SellerAgent = {
	title:  'Seller Agent',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: true,
	sale: true
}

const CoSellerAgent = {
	title:  'Co Seller Agent',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: true,
	sale: true
}

const SellerPowerOfAttorney = {
	title:  'Seller PowerOf Attorney',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: false,
	sale: true
}

const SellerLawyer = {
	title:  'Seller Lawyer',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: false,
	sale: true
}

const SellerReferral = {
	title:  'Seller Referral',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: false,
	sale: true
}

const SellerBroker = {
	title:  'Seller Broker',
	Selling: true,
	Buying: false,
	Offer: false,

	lease: true,
	sale: true
}

const Title = {
	title:  'Escrow Officer',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: false,
	sale: true
}

const Tenant = {
	title:  'Tenant',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: false
}

const TenantPowerOfAttorney = {
	title:  'Tenant Power Of Attorney',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: false
}

const Landlord = {
	title:  'Landlord',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: false
}

const LandlordPowerOfAttorney = {
	title:  'Landlord Power Of Attorney',
	Selling: false,
	Buying: true,
	Offer: true,

	lease: true,
	sale: false
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
