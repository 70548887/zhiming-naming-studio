import { describe, expect, it } from 'vitest';
import type { StudioSettings } from '../src/shared/types';
import { aiSettingKeys, brandSettingKeys, createSettingsVersions, pickAiSettings, pickBrandSettings, reconcileSettingsDraft, settingsFieldsDirty, settingsSaveTicket } from '../src/renderer/settings-state';

const baseline:StudioSettings = { studioName:'原工作室',contact:'原联系方式',logoDataUrl:'',apiBaseUrl:'https://provider.example/v1',model:'old-model',timeoutMs:45000,hasApiKey:true,useAi:true };

describe('settings submission reconciliation', () => {
  it('accepts canonical normalization for untouched submitted fields, while preserving every other panel draft', () => {
    const versions=createSettingsVersions(),ticket=settingsSaveTicket(versions,brandSettingKeys);
    const current={...baseline,studioName:' 新名称 ',apiBaseUrl:'尚未保存的新接口',timeoutMs:0};
    const saved={...baseline,studioName:'新名称'};
    expect(reconcileSettingsDraft(current,saved,ticket,versions)).toEqual({...current,studioName:'新名称'});
    expect(settingsFieldsDirty(current,baseline,aiSettingKeys)).toBe(true);
  });

  it('protects fields edited and then changed back while saving, rather than comparing only their final text', () => {
    const versions=createSettingsVersions(),ticket=settingsSaveTicket(versions,brandSettingKeys);
    versions.studioName+=2;
    const current={...baseline,studioName:' 新名称 '};
    const saved={...baseline,studioName:'新名称',contact:'服务端规范化联系方式'};
    expect(reconcileSettingsDraft(current,saved,ticket,versions)).toEqual({...saved,studioName:' 新名称 '});
  });

  it('updates credential facts even when all editable AI fields are newer drafts', () => {
    const versions=createSettingsVersions(),ticket=settingsSaveTicket(versions,aiSettingKeys);
    for(const key of aiSettingKeys) versions[key]++;
    const current={...baseline,apiBaseUrl:'新接口',model:'新模型',timeoutMs:60000,useAi:false,contact:'未保存品牌'};
    const saved={...baseline,hasApiKey:false,useAi:false,credentialNotice:'已清除密钥'};
    expect(reconcileSettingsDraft(current,saved,ticket,versions)).toEqual({...current,hasApiKey:false,credentialNotice:'已清除密钥'});
  });

  it('whitelists each independent payload and ignores noneditable credential metadata for dirty state', () => {
    expect(pickBrandSettings(baseline)).toEqual({studioName:'原工作室',contact:'原联系方式',logoDataUrl:''});
    expect(pickAiSettings(baseline)).toEqual({apiBaseUrl:'https://provider.example/v1',model:'old-model',timeoutMs:45000,useAi:true});
    expect(settingsFieldsDirty({...baseline,hasApiKey:false,credentialNotice:'changed'},baseline,[...aiSettingKeys,...brandSettingKeys])).toBe(false);
  });
});
