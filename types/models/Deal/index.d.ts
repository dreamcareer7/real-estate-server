declare interface IDeal extends IModel {
  title: string;
  listing?: UUID;
  brand: UUID;
  faired_at?: number;
}

declare type TDealRole =
  | 'BuyerAgent'
  | 'CoBuyerAgent'
  | 'SellerAgent'
  | 'CoSellerAgent'
  | 'Buyer'
  | 'Seller'
  | 'Title'
  | 'Lawyer'
  | 'Lender'
  | 'TeamLead'
  | 'Appraiser'
  | 'Inspector'
  | 'Tenant'
  | 'Landlord'
  | 'SellerLawyer'
  | 'BuyerLawyer'
  | 'SellerReferral'
  | 'BuyerReferral'
  | 'BuyerPowerOfAttorney'
  | 'SellerPowerOfAttorney'
  | 'LandlordPowerOfAttorney'
  | 'TenantPowerOfAttorney'
  | 'BuyerBroker'
  | 'SellerBroker'