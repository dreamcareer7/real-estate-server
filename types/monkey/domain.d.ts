import {Client} from 'pg'

declare module "domain" {
  export interface Domain {
    jobs: any[];
    i: number;
    db: Client;
  }
}
