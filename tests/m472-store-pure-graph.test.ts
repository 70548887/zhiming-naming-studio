/** Actual Store cross-API regressions for the private pure graph memo.
 * A pair of equal real reads proves observable equality, not a cache hit.
 * Root coverage proves hit/build reduction and fresh loader/receipt execution.
 * No caller operation/capsule, public override, or mirror cache is constructed. */
import {beforeAll,describe,expect,it} from 'vitest';
import {join} from 'node:path';
import {
  prepareGenuineSeed,withFixture,sourceFile,bytes,replaceOwned,differentBytes,captured,
} from './helpers/m458-store-fixture';

beforeAll(prepareGenuineSeed);

async function rejectsChangedOriginalAfterWarm(name:'naming-editorial-v4.json'|'dataset-v6.json'):Promise<void> {
  await withFixture(({store,current,userDir})=>{
    const first=store.readVerifiedSession(current.id);
    const second=store.readVerifiedSession(current.id);
    expect(first).toEqual(current);
    expect(second).toEqual(first);
    expect(second).toEqual(current);

    const databaseFile=join(userDir,'customers.sqlite'),before=bytes(databaseFile);
    const originalFile=sourceFile(name),original=bytes(originalFile),changed=differentBytes(original);
    let changedBytesObserved=false,failed:{value?:unknown;error?:unknown}={};
    try{
      replaceOwned(originalFile,changed);
      changedBytesObserved=bytes(originalFile).equals(changed);
      // A new public call must authenticate this directory again even if a
      // complete pure graph for the original bytes remains in a private slot.
      failed=captured(()=>store.readVerifiedSession(current.id));
    }finally{replaceOwned(originalFile,original);}

    expect(changedBytesObserved).toBe(true);
    expect(failed.error).toBeInstanceOf(Error);
    expect(failed.value).toBeUndefined();
    expect(bytes(originalFile).equals(original)).toBe(true);
    expect(bytes(databaseFile).equals(before)).toBe(true);

    const recovered=store.readVerifiedSession(current.id);
    expect(recovered).toEqual(current);
    expect(recovered).toEqual(first);
    expect(bytes(databaseFile).equals(before)).toBe(true);
  });
}

describe('M472 actual Store warm pure graph source boundaries',()=>{
  it('rejects a changed actual V4 original on a new API after two equal complete reads and recovers after exact restoration',async()=>{
    await rejectsChangedOriginalAfterWarm('naming-editorial-v4.json');
  });

  it('rejects a changed actual dataset original on a new API after two equal complete reads and recovers after exact restoration',async()=>{
    await rejectsChangedOriginalAfterWarm('dataset-v6.json');
  });
});
