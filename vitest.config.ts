import{defineConfig}from'vitest/config';
import {lstatSync} from 'node:fs';
import manifest from './tests/environment-suite-manifest.json';
const configured=[...manifest.entries,...manifest.integrationDependencies];
const installed=configured.filter(entry=>{try{const stat=lstatSync(new URL(entry.file,import.meta.url));return stat.isFile()&&!stat.isSymbolicLink();}catch{return false;}}).length;
console.info(`[tests] Repository-contained discovery excludes ${installed}/${configured.length} installed/declared environment files. Exclusion is NOT a test pass or acceptance. Use the explicit environment group; see docs/TEST-ENVIRONMENT-PARTITION.md.`);
export default defineConfig({test:{include:['tests/**/*.test.ts','tests/**/*.test.tsx','src/renderer/**/*.test.tsx'],exclude:['tests/fixtures/**',...configured.map(entry=>entry.file)],maxWorkers:2}});
