import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture,VERSION} from './release-directory.fixture.mjs';
import {verifyRelease,releaseArtifactPaths,releaseArgumentsFor,assertReleasePackageCommand} from './release.mjs';
import {assembleRelease} from './release-assemble.mjs';
import {publishRelease} from './release-publication.mjs';
import {reference} from './release-capture.mjs';
import {sha256} from './common.mjs';
const selected='.local/独立 验收/release',npm=path.resolve('npm-cli.js');
const argv=directory=>[npm,'run','package','--','--config.directories.output='+directory];
const read=file=>fs.readFileSync(file);
const noOutput=f=>assert.equal(fs.existsSync(f.abs('.local/rejected')),false);
async function assembled(options={}){
 const f=await fixture({releaseDirectory:selected,...options});
 const result=await assembleRelease({root:f.root,config:f.config,output:'.local/typed'});
 if(result.record){f.write(selected+'/NamingStudio-'+VERSION+'-verification.json',result.record);f.write(selected+'/NamingStudio-'+VERSION+'-Setup.exe.sha256',result.record.installer.sha256+'  NamingStudio-'+VERSION+'-Setup.exe\n');}
 return {...f,assembled:result};
}

test('omitted directory keeps legacy pending shape and exact default argv',async()=>{
 const f=await fixture();fs.rmSync(f.abs('release'),{recursive:true});
 const value=await verifyRelease({root:f.root});assert.equal(value.status,'pending');assert.equal(value.writes,0);
 assert.deepEqual(value.pending[0].missing,[f.abs('release/NamingStudio-'+VERSION+'-verification.json'),f.abs('release/NamingStudio-'+VERSION+'-Setup.exe')]);
 assertReleasePackageCommand([npm,'run','package']);assert.throws(()=>assertReleasePackageCommand(argv('release')));
 assert.equal(Object.hasOwn(value,'releaseDirectory'),false);
});

test('canonical nested directory binds installer, record, sidecar and default ASAR together',async()=>{
 const f=await fixture(),files=releaseArtifactPaths(f.root,VERSION,selected);
 assert.equal(files.directory,f.abs(selected));assert.equal(files.sidecar,files.installer+'.sha256');
 assert.equal(path.dirname(files.installer),path.dirname(files.recordPath));assert.equal(files.builtAsar,f.abs(selected+'/win-unpacked/resources/app.asar'));
 const value=await verifyRelease({root:f.root,releaseDirectory:selected});assert.equal(value.status,'pending');
 assert.ok(value.pending[0].missing.every(file=>file.startsWith(files.directory+path.sep)));
});

for(const directory of ['',null,42,{},'.','..','../outside','x/../outside','x/./release','x//release','x/release/','/outside','C:/outside','C:outside','\\\\server\\share','\\?\\C:\\release','x\\release','x\u0000release','x\nrelease','x:stream','trailing.','trailing ','con','NUL.txt','x/LPT1'])test('unsafe directory is rejected: '+JSON.stringify(directory),async()=>{
 const f=await fixture();assert.throws(()=>releaseArtifactPaths(f.root,VERSION,directory));
});

test('a regular file cannot serve as the artifact directory',async()=>{
 const f=await fixture();f.write('.local/directory-file','x');assert.throws(()=>releaseArtifactPaths(f.root,VERSION,'.local/directory-file'),/directory|ENOTDIR/);
});

test('directory junction is rejected before pending or artifact reading',async()=>{
 const f=await fixture(),target=f.abs('.local/target');fs.mkdirSync(target,{recursive:true});fs.symlinkSync(target,f.abs('.local/alias'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>releaseArtifactPaths(f.root,VERSION,'.local/alias/release'),/reparse|symbolic/);
});

for(const artifact of ['installer','recordPath','sidecar','builtAsar'])test('artifact alias is rejected before reads: '+artifact,async()=>{
 const f=await fixture(),files=releaseArtifactPaths(f.root,VERSION,selected),target=f.write('.local/foreign-'+artifact,'unrelated original bytes');
 fs.mkdirSync(path.dirname(files[artifact]),{recursive:true});fs.symlinkSync(target,files[artifact],'file');
 assert.throws(()=>releaseArtifactPaths(f.root,VERSION,selected),/reparse|symbolic/);assert.equal(read(target).toString(),'unrelated original bytes');
});

test('versioned explicit assembly and selected verification run against one directory with legacy decoys unused',async()=>{
 const f=await assembled(),before=sha256(read(f.config.installer));
 f.write('release/NamingStudio-'+VERSION+'-Setup.exe','decoy');f.write('release/NamingStudio-'+VERSION+'-verification.json','{invalid decoy');
 const result=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected});
 assert.equal(result.status,'passed',JSON.stringify(result));assert.equal(result.writes,0);assert.equal(result.networkRequests,0);
 assert.equal(result.checks.find(c=>c.check==='installer').file,f.config.installer);assert.equal(sha256(read(f.config.installer)),before);
 assert.equal(f.assembled.record.releaseDirectory,selected);
});

test('missing selected artifacts never fall back to valid legacy release',async()=>{
 const f=await fixture(),result=await assembleRelease({root:f.root,config:f.config,output:'.local/typed'});
 f.write('release/NamingStudio-'+VERSION+'-verification.json',result.record);f.write('release/NamingStudio-'+VERSION+'-Setup.exe.sha256',result.record.installer.sha256);
 const value=await verifyRelease({root:f.root,releaseDirectory:selected,strictLocal:true});assert.equal(value.status,'pending');assert.equal(value.checks.length,0);
});

test('selected directory cannot borrow the legacy sidecar',async()=>{
 const f=await assembled();fs.renameSync(f.abs(selected+'/NamingStudio-'+VERSION+'-Setup.exe.sha256'),f.write('release/sidecar-placeholder',''));
 const result=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected});assert.equal(result.status,'pending');assert.ok(result.pending.some(p=>p.check==='installer-sidecar'));
});

test('selected sidecar must name the exact installer rather than another path basename',async()=>{
 const f=await assembled();f.write(selected+'/NamingStudio-'+VERSION+'-Setup.exe.sha256',f.assembled.record.installer.sha256+'  other/NamingStudio-'+VERSION+'-Setup.exe\n');
 const result=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected});assert.equal(result.status,'failed');assert.ok(result.errors.some(p=>p.check==='installer-sidecar'));
});

test('record cannot declare a different selected directory',async()=>{
 const f=await assembled();f.assembled.record.releaseDirectory='release';f.write(selected+'/NamingStudio-'+VERSION+'-verification.json',f.assembled.record);
 const result=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected});assert.equal(result.status,'failed');assert.ok(result.errors.some(p=>p.check==='release-directory-record'));
});

for(const disguise of ['none','declaration-only','declaration-and-paths'])test('copied legacy evidence cannot attest a selected directory: '+disguise,async()=>{
 const f=await fixture(),result=await assembleRelease({root:f.root,config:f.config,output:'.local/typed'}),record=result.record;
 f.write(selected+'/NamingStudio-'+VERSION+'-Setup.exe',read(f.config.installer));f.write(selected+'/win-unpacked/resources/app.asar',read(f.config.builtAsar));f.write(selected+'/win-unpacked/fixture.exe','synthetic app bytes');
 if(disguise!=='none')record.releaseDirectory=selected;
 if(disguise==='declaration-and-paths'){record.installer.path=f.abs(selected+'/NamingStudio-'+VERSION+'-Setup.exe');record.asar.built=f.abs(selected+'/win-unpacked/resources/app.asar');}
 f.write(selected+'/NamingStudio-'+VERSION+'-verification.json',record);f.write(selected+'/NamingStudio-'+VERSION+'-Setup.exe.sha256',record.installer.sha256+'  NamingStudio-'+VERSION+'-Setup.exe\n');
 const value=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected});assert.equal(value.status,'failed');
 assert.ok(value.errors.some(error=>error.check.startsWith('release-directory-')),JSON.stringify(value));
 if(disguise==='declaration-and-paths')assert.ok(value.errors.some(error=>error.check==='release-directory-build-capture'));
});

test('explicit verification cannot override built ASAR to another directory',async()=>{
 const f=await assembled();f.write('release/win-unpacked/resources/app.asar',read(f.config.builtAsar));
 await assert.rejects(verifyRelease({root:f.root,strictLocal:true,releaseDirectory:selected,builtAsar:f.abs('release/win-unpacked/resources/app.asar')}),/Built ASAR differs/);
});

for(const value of [undefined,null,'','release',selected])test('legacy config rejects own releaseDirectory even when '+String(value),async()=>{
 const f=await fixture();f.config.releaseDirectory=value;
 await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/config version/);noOutput(f);
});

test('legacy config rejects a CLI directory flag without writing output',async()=>{
 const f=await fixture();await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected',releaseDirectory:'release'}),/config version/);noOutput(f);
});

test('new explicit schemas require directory, reject unknown fields and require CLI agreement',async()=>{
 const f=await fixture({releaseDirectory:selected});delete f.config.releaseDirectory;
 await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/Explicit release directory/);
 f.config.releaseDirectory=selected;f.config.outputOverride='anywhere';await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/Unknown explicit/);
 delete f.config.outputOverride;await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected',releaseDirectory:'release'}),/differs/);noOutput(f);
});

test('unknown assembly schema never gains directory support by a broad version check',async()=>{
 const f=await fixture({releaseDirectory:selected});f.config.schema='naming-studio-release-execution/99';await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/Versioned/);noOutput(f);
});

test('explicit directory cannot contain the freeze or frozen production inputs',async()=>{
 const f=await fixture({releaseDirectory:selected});
 for(const directory of ['.local','src','data','node_modules']){f.config.releaseDirectory=directory;await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/frozen|production/);}
 noOutput(f);
});

test('binary references cannot be grafted from a different directory even with equal bytes',async()=>{
 const f=await fixture({releaseDirectory:selected});f.config.installer=f.write('release/NamingStudio-'+VERSION+'-Setup.exe',read(f.config.installer));
 await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/binary paths/);noOutput(f);
});

test('new explicit config rejects unbound legacy three-argument package command',async()=>{
 const f=await fixture({releaseDirectory:'release'});f.update(f.captures.buildAndPackage,c=>c.command.args=c.command.args.slice(0,3));
 await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/exact selected release directory/);noOutput(f);
});

test('exact explicit argv accepts a Unicode and space value as a single argument',()=>assertReleasePackageCommand(argv(selected),selected,{explicit:true}));
for(const [label,args] of [
 ['four arguments',argv(selected).slice(0,4)],['six arguments',[...argv(selected),'--publish=always']],
 ['missing separator',[npm,'run','package','--config.directories.output='+selected]],
 ['split output flag',[npm,'run','package','--','--config.directories.output',selected]],
 ['different output',argv('release')],['equivalent but noncanonical output',argv('.local/独立 验收/./release')],
 ['swapped separator',[npm,'run','package','--config.directories.output='+selected,'--']],
 ['duplicate output',[...argv(selected),'--config.directories.output='+selected]],
 ['another script',[npm,'run','build','--','--config.directories.output='+selected]],
 ['arbitrary entry',['other-cli.js',...argv(selected).slice(1)]]
])test('exact package argv rejects '+label,()=>assert.throws(()=>assertReleasePackageCommand(args,selected,{explicit:true}),/exact selected/));

test('assembly retains the full-regression no-filter gate for new directories',async()=>{
 const f=await fixture({releaseDirectory:selected});f.update(f.captures.fullRegression,c=>c.command.args.push('tests/one.test.ts'));
 await assert.rejects(assembleRelease({root:f.root,config:f.config,output:'.local/rejected'}),/filter|complete machine/);noOutput(f);
});

test('new phased execution keeps the test freeze and produces versioned bundle3 without final release',async()=>{
 const f=await assembled({phased:true});assert.equal(f.assembled.bundle.schema,'naming-studio-execution-bundle/3');assert.equal(f.assembled.bundle.releaseDirectory,selected);
 assert.equal(f.assembled.bundle.status,'awaiting-publication');assert.equal(f.assembled.record,undefined);
 assert.equal(fs.existsSync(f.abs(selected+'/NamingStudio-'+VERSION+'-verification.json')),false);
 await assert.rejects(publishRelease({root:f.root,bundle:await reference(f.root,f.assembled.file),output:'.local/rejected'}),/Explicit publication directory/);noOutput(f);
});

test('new assembly CLI takes the exact same config directory and rejects unknown or duplicate flags',async()=>{
 const f=await fixture({releaseDirectory:selected}),config=f.write('.local/config.json',f.config),script=path.join(import.meta.dirname,'release-assemble.mjs');
 const args=['--root',f.root,'--config',config,'--output','.local/cli-typed','--release-directory',selected];
 const good=spawnSync(process.execPath,[script,...args],{encoding:'utf8',windowsHide:true});assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).typedContract,'passed');
 for(const bad of [[...args,'--typo','ignored'],[...args,'--release-directory',selected],args.slice(0,-1),[...args.slice(0,-1),'release']]){const result=spawnSync(process.execPath,[script,...bad],{encoding:'utf8',windowsHide:true});assert.equal(result.status,1);}
});

test('release checker CLI parses selected directory and retains legacy parser rejection',async()=>{
 const f=await fixture(),parsed=releaseArgumentsFor(['--root',f.root,'--strict-local','--release-directory',selected]);assert.equal(parsed.releaseDirectory,selected);assert.equal(parsed.strictLocal,true);
 for(const args of [['--release-directory'],['--release-directory','a','--release-directory','b'],['--root','--release-directory','a'],['--unknown','x']])assert.throws(()=>releaseArgumentsFor(args));
 const result=spawnSync(process.execPath,[path.join(import.meta.dirname,'release.mjs'),'--root',f.root,'--release-directory',selected],{encoding:'utf8',windowsHide:true});assert.equal(result.status,2,result.stderr);assert.equal(JSON.parse(result.stdout).status,'pending');
});
