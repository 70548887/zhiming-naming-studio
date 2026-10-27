import {it,expect} from 'vitest';
import {formDraftKey} from '../src/renderer/ui-state';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile} from '../src/shared/types';
it('empty family confirmation and legacy absence have the same untouched form key',()=>{const profile:BirthProfile={"id":"empty-parent-form","customerName":"","surname":"林","surnamePinyin":"lín","gender":"中性","calendar":"solar","birthDate":"2029-03-25","leapMonth":false,"birthTime":"03:30","timeUnknown":false,"birthPlace":"杭州","timezone":"Asia/Shanghai","notes":"","fatherName":"林知源","motherName":"陈若兰"};const prefs=normalizePreferences();expect(formDraftKey({...profile,parentNameReadings:[]},prefs)).toBe(formDraftKey(profile,prefs));});
