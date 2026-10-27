import type {B04WordContextQuery,B04WordContextOption,B04WordContextOptions} from '../domain/meaning-context-m460-b04-adapter.mjs';
export type {B04WordContextQuery,B04WordContextOption,B04WordContextOptions};
export interface B04WordContextApi {
  getB04WordContextOptions(input:B04WordContextQuery):Promise<B04WordContextOptions>;
}
