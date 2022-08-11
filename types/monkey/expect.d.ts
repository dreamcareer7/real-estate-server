declare module Chai {
  export interface Assertion {
    uuid;
    phone;
    date;
  }

  export interface TypeComparison {
    uuid;
    phone;
  }
}