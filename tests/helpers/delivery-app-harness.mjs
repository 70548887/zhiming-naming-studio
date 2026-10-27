import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Current App handlers run without a DOM; separate browser tests cover focus and actual rendering.
const root = process.cwd(), dir = path.join(root, '.local/ui-107'); fs.mkdirSync(dir, { recursive: true });
const source = fs.readFileSync('src/renderer/main.tsx', 'utf8').replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/, 'export { App, getReportCandidates };');
const hookSource = `let active;
export const StrictMode='strict',Fragment='fragment';
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}});
export const useState=init=>{const c=active,i=c.index++;if(!(i in c.slots))c.slots[i]=typeof init==='function'?init():init;return[c.slots[i],v=>c.slots[i]=typeof v==='function'?v(c.slots[i]):v];};
export const useRef=v=>{const c=active,i=c.index++;return c.slots[i]??(c.slots[i]={current:v});};
export const useMemo=fn=>{active.index++;return fn();};
export const useId=()=>{const c=active;return 'delivery-test-'+c.index++;};
export const useSyncExternalStore=(_subscribe,get)=>get();
export const useEffect=(fn,deps)=>{const c=active,i=c.index++,old=c.slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j]))){c.effects.push(()=>{old?.cleanup?.();const cleanup=fn();c.slots[i]={deps,cleanup};});}};
export const useLayoutEffect=useEffect;export const createContext=v=>({value:v});
globalThis.__deliveryHooks={create:()=>({slots:[],index:0,effects:[]}),render:(c,fn)=>{active=c;c.index=0;const tree=fn();for(const e of c.effects.splice(0))e();return tree;},dispose:c=>{for(const v of c.slots)v?.cleanup?.();}};
export default {createElement,StrictMode,Fragment};`;
const icons = new Set();
for (const name of fs.readdirSync('src/renderer').filter(n => n.endsWith('.tsx'))) {
  const text = fs.readFileSync(path.join('src/renderer', name), 'utf8');
  for (const match of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)) for (const icon of match[1].split(',')) icons.add(icon.trim());
}
const compiled = path.join(dir, 'delivery-app-compiled.mjs');
await build({ stdin: { contents: source, sourcefile: 'src/renderer/main.tsx', resolveDir: path.join(root, 'src/renderer'), loader: 'tsx' }, outfile: compiled, bundle: true, platform: 'node', format: 'esm', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'delivery-hooks', setup(b) {
  b.onResolve({ filter: /^(react|react-dom(?:\/client)?|lucide-react)$/ }, a => ({ path: a.path, namespace: 'delivery' }));
  b.onLoad({ filter: /.*/, namespace: 'delivery' }, a => ({ contents: a.path === 'react' ? hookSource : a.path === 'lucide-react' ? [...icons].map(x => `export const ${x}='icon-${x}';`).join('\n') : a.path === 'react-dom/client' ? 'export const createRoot=()=>({render(){}});' : 'export const createPortal=x=>x;', loader: 'js' }));
} }] });
const { App, getReportCandidates } = await import(pathToFileURL(compiled).href);
const profile = { id: 'delivery-person', customerName: '交付测试家庭', surname: '王', surnamePinyin: 'wáng', gender: '中性', calendar: 'solar', birthDate: '2026-10-17', leapMonth: false, birthTime: '09:30', timeUnknown: false, birthPlace: '杭州', timezone: 'Asia/Shanghai', notes: '' };
const preferences = { length: 2, generationChar: '', requiredChars: '', forbiddenChars: '', elderTaboo: '', style: '自然', meanings: '', industry: '', priority: 'balanced', preferredElements: [], zodiacRules: false, numerology: false, avoidParentNames: true };
const candidates = ['明安', '清安', '文安'].map((givenName, i) => ({ id: 'delivery-' + i, givenName, fullName: '王' + givenName, pinyin: '', style: '', characters: [], meaning: '保存寓意', reason: '', citations: [], evaluation: { sound: 70 + i, meaning: 80 - i, simplicity: 60 + i, traditional: 50, distinctiveness: 90 - i }, warnings: [], traditionalReason: '', favorite: i === 1, origin: 'local', reviewNote: '', originalMeaning: '保存寓意' }));
const initial = { id: 'session-delivery-00000001', profileId: profile.id, createdAt: '2026-10-18T01:00:00Z', profile, preferences, analysis: { bazi: { favorable: ['木'] }, qimen: { available: false } }, candidates, reviewNote: '', originalFavorable: ['木'], dataVersion: 'fixture' };
const savedBrand = { studioName: '已保存工作室', contact: '已保存联系', logoDataUrl: '', apiBaseUrl: 'https://example.invalid/v1', model: '', timeoutMs: 45000, hasApiKey: false, useAi: false };
const clone = v => structuredClone(v), all = (v, out = []) => { if (Array.isArray(v)) v.forEach(x => all(x, out)); else if (v && typeof v === 'object' && v.props) { out.push(v); all(v.props.children, out); all(v.props.action, out); } return out; };
const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : n?.props ? text(n.props.children) : '';
const results = [];
async function setup(outcome) {
  let persisted = clone(initial); const requests = [], events = new Map();
  globalThis.document = { getElementById: () => null, querySelector: () => null, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  globalThis.window = { addEventListener() {}, removeEventListener() {}, studio: {
    bootstrap: async () => ({ profiles: [clone(profile)], sessions: [clone(persisted)], settings: clone(savedBrand), sources: [], stats: { characters: 774, citations: 1833, knowledge: 433, dataVersion: 'fixture' } }),
    saveSession: async s => { requests.push({ kind: 'save', session: clone(s) }); persisted = clone(s); return clone(s); },
    exportReport: async s => { requests.push({ kind: 'export', session: clone(s), names: getReportCandidates(s).map(c => c.fullName) }); return outcome(); },
  } };
  const hooks = globalThis.__deliveryHooks, app = hooks.create(); let tree = hooks.render(app, App);
  const tick = async () => { await Promise.resolve(); await new Promise(r => setImmediate(r)); tree = hooks.render(app, App); };
  const find = pred => { const node = all(tree).find(pred); assert.ok(node, 'Expected current App control'); return node; };
  const click = label => find(n => n.type === 'button' && text(n) === label).props.onClick();
  const plan = () => all(tree).find(n => n.props?.onConfirm && n.props?.batchLabel);
  await tick(); click('方案与报告'); await tick(); find(n => n.props?.onSelect && n.props?.sessions).props.onSelect(clone(persisted)); await tick();
  return { tick, find, click, plan, requests, tree: () => tree, dispose: () => hooks.dispose(app) };
}
{
  const a = await setup(() => 'C:/isolated-fixture/report.pdf');
  a.click('工作室设置'); await a.tick();
  const field = a.find(n => n.props.label === '工作室名称'); all(field).find(n => n.type === 'input').props.onChange({ target: { value: '尚未保存的品牌' } }); await a.tick();
  a.click('方案与报告'); await a.tick();
  a.find(n => n.type === 'textarea' && n.props.id === 'report-review-note').props.onChange({ target: { value: '本次导出的意见' } }); await a.tick();
  a.click('导出 PDF 报告'); await a.tick(); const popup = a.plan();
  assert.ok(popup); assert.equal(a.requests.length, 0); assert.equal(popup.props.settings.studioName, savedBrand.studioName); assert.equal(popup.props.settingsDirty, true); assert.equal(popup.props.reportDirty, true); assert.equal(popup.props.session.reviewNote, '本次导出的意见');
  popup.props.onConfirm(); popup.props.onConfirm(); await a.tick(); await a.tick();
  assert.deepEqual(a.requests.map(r => r.kind), ['save', 'export']); assert.deepEqual(a.requests[1].names, ['王清安']); assert.deepEqual(a.requests[1].session.candidates.map(c => c.id), candidates.map(c => c.id)); assert.equal(a.requests[1].session.reviewNote, '本次导出的意见'); assert.equal(a.plan(), undefined); a.dispose(); results.push({ name: 'confirmation is read-only until confirmed; saves note once, uses saved brand and exact favorite list', passed: true });
}
{
  const a = await setup(() => null); a.click('导出 PDF 报告'); await a.tick(); a.plan().props.onConfirm(); await a.tick(); await a.tick();
  assert.equal(a.plan(), undefined); assert.ok(all(a.tree()).some(n => n.props.className?.includes('toast') && text(n).includes('已取消文件保存'))); a.dispose(); results.push({ name: 'cancelled file picker closes confirmation and identifies saved review state', passed: true });
}
{
  let fail = true; const a = await setup(() => { if (fail) throw new Error('测试导出失败'); return 'C:/isolated-fixture/retry.pdf'; });
  a.click('导出 PDF 报告'); await a.tick(); a.plan().props.onConfirm(); await a.tick(); await a.tick();
  assert.ok(a.plan()?.props.error.includes('测试导出失败')); assert.equal(a.plan().props.busy, false); fail = false; a.plan().props.onConfirm(); await a.tick(); await a.tick(); assert.equal(a.plan(), undefined); assert.equal(a.requests.filter(r => r.kind === 'export').length, 2); a.dispose(); results.push({ name: 'export failure retains confirmation and retry succeeds without changing selection', passed: true });
}
{
  const a = await setup(() => 'unused'); a.click('导出 PDF 报告'); await a.tick(); a.plan().props.onClose(); await a.tick(); assert.equal(a.requests.length, 0); assert.equal(a.plan(), undefined); a.dispose(); results.push({ name: 'returning to review does not save or call export', passed: true });
}
const result = { note: 'Actual App event handlers in isolated hooks; not a DOM or PDF/file-picker test.', results };
fs.writeFileSync(path.join(dir, 'delivery-handler-results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
