import type {ProjectApplicationV132R2BuildIdentity} from './build-project-application-v132-r2.mjs';

export interface Candidate2NamingDependencyOptions {
 /** Absolute physical workspace root; symlink and junction ancestors are rejected. */
 root:string;
 /** Root-local physical output directory; defaults to dist-electron. */
 outDir?:string;
}
export interface Candidate2NamingDependencyResult {
 readonly schema:'candidate2-naming-dependency/1';
 readonly status:'built'|'verified-existing';
 readonly root:string;
 readonly outDir:string;
 readonly bundlePath:string;
 readonly receiptPath:string;
 readonly identity:Readonly<ProjectApplicationV132R2BuildIdentity>;
 readonly output:Readonly<{file:'application.cjs';bytes:number;sha256:string}>;
 readonly receiptSha256:string;
 readonly inputOrigin:'fixed-publication-private-root';
 readonly hostPackageRead:false;
 readonly hostEngineRead:false;
 readonly hostCoreVendorRead:false;
 readonly compilerOrigin:'host-esbuild-fixed-version-0.25.12';
 /** This is verified post-write state, not a two-file transaction guarantee. */
 readonly pairPublication:'sequential-files-verified-after-write';
 readonly filesystemBoundary:'physical-path-checks; no concurrent privileged-writer exclusion';
}
export function ensureCandidate2NamingDependency(options:Candidate2NamingDependencyOptions):Promise<Candidate2NamingDependencyResult>;
