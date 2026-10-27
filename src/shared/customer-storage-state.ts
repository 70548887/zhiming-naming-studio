/** Physical customer storage state; no saved naming facts are asserted by this DTO. */
export interface CustomerStorageState {
  version: string;
  migrationRequired: boolean;
  bytes: number;
  maxPhysicalBytes: number;
  warning: boolean;
}
