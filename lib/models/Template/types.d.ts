export type ETemplateType =
  | 'Listing'
  | 'Contact'
  | 'CrmOpenHouse'
  | 'Birthday'
  | 'JustListed'
  | 'JustSold'
  | 'OpenHouse'
  | 'AsSeenIn'
  | 'PriceImprovement'
  | 'ComingSoon'
  | 'Listings'
  | 'NewYear'
  | 'Christmas'
  | 'Brand'
  | 'NewAgent'
  | 'Valentines'
  | 'StPatrick'
  | 'Easter'
  | 'OtherHoliday'
  | 'UnderContract'
  | 'Layout'
  | 'ListingLayout'
  | 'Newsletter'
  | 'FathersDay'
  | 'MothersDay'
  | 'MemorialDay'
  | 'Passover'
  | 'ChineseNewYear'
  | 'LaborDay'
  | 'Hannukkah'
  | 'FourthOfJuly'
  | 'VeteransDay'
  | 'Thanksgiving'
  | 'Halloween'
  | 'MLKDay'
  | 'IndependenceDay'
  | 'Diwali'
  | 'WomansDay'
  | 'Kwanzaa'
  | 'WeddingAnniversary'
  | 'HomeAnniversary'
  | 'RoshHashanah'
  | 'PatriotsDay'
  | 'BackToSchool'
  | 'ColumbusDay'
  | 'DaylightSaving'
  ;

export type ETemplateMedium =
  | 'Email'
  | 'Social'
  | 'CrmOpenHouse'
  | 'FacebookCover'
  | 'InstagramStory'
  | 'LinkedInCover'
  | 'Letter'
  ;

export type ETemplateInput =
  | 'contact'
  | 'user'
  | 'listing'
  ;

export interface IStoredTemplate extends IModel {
  name: string;
  template_type: ETemplateType;
  medium: ETemplateMedium;
  video: boolean;
  url: string;
  variant: string;
  inputs: ETemplateInput[];
  mjml: boolean;
  file: UUID;
  is_shared: boolean;
  variables: string[];
}
