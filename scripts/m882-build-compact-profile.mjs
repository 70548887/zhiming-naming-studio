import {build} from 'esbuild';import path from 'node:path';import {createRequire} from 'node:module';
const root=process.cwd(),require=createRequire(import.meta.url),sql=require.resolve('sql.js'),lunar=require.resolve('lunar-typescript');
await build({entryPoints:['scripts/m882-compact-profile.ts'],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:'.local/m882-compact-profile.cjs',plugins:[{name:'m882-runtime',setup(build){build.onResolve({filter:/^sql\.js$/},()=>({path:sql,external:true}));build.onResolve({filter:/^lunar-typescript$/},()=>({path:lunar,external:true}));}}],logLevel:'silent'});
console.log('built .local/m882-compact-profile.cjs');
