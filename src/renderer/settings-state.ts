import type { AiSettings, BrandSettings, StudioSettings } from '../shared/types';

export const brandSettingKeys = ['studioName', 'contact', 'logoDataUrl'] as const;
export const aiSettingKeys = ['apiBaseUrl', 'model', 'timeoutMs', 'useAi'] as const;
export type EditableSettingKey = typeof brandSettingKeys[number] | typeof aiSettingKeys[number];
export type SettingsVersions = Record<EditableSettingKey, number>;
export type SettingsSaveTicket = Partial<SettingsVersions>;

export function createSettingsVersions(): SettingsVersions {
  return { studioName: 0, contact: 0, logoDataUrl: 0, apiBaseUrl: 0, model: 0, timeoutMs: 0, useAi: 0 };
}

export function settingsSaveTicket(versions: SettingsVersions, keys: readonly EditableSettingKey[]): SettingsSaveTicket {
  return Object.fromEntries(keys.map(key => [key, versions[key]]));
}

/** Reconcile only submitted fields that the user has not touched since the request. */
export function reconcileSettingsDraft(current: StudioSettings, saved: StudioSettings, ticket: SettingsSaveTicket, versions: SettingsVersions): StudioSettings {
  const next = { ...current, hasApiKey: saved.hasApiKey, credentialNotice: saved.credentialNotice };
  for (const key of Object.keys(ticket) as EditableSettingKey[]) {
    if (versions[key] === ticket[key]) Object.assign(next, { [key]: saved[key] });
  }
  return next;
}

export function settingsFieldsDirty(draft: StudioSettings, baseline: StudioSettings, keys: readonly EditableSettingKey[]): boolean {
  return keys.some(key => draft[key] !== baseline[key]);
}

export function pickBrandSettings(settings: StudioSettings): BrandSettings {
  return { studioName: settings.studioName, contact: settings.contact, logoDataUrl: settings.logoDataUrl };
}

export function pickAiSettings(settings: StudioSettings): AiSettings {
  return { apiBaseUrl: settings.apiBaseUrl, model: settings.model, timeoutMs: settings.timeoutMs, useAi: settings.useAi };
}
