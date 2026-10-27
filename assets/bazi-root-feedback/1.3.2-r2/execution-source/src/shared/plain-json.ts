/** Canonical plain JSON without invoking accessors or accepting holes and hidden metadata. */
export function canonicalPlainJson(value:unknown,depth=0):string {
  if(depth>100)throw new Error('保存快照结构过深。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value)){
    if(Object.getPrototypeOf(value)!==Array.prototype)throw new Error('保存快照数组原型无效。');
    const keys=Reflect.ownKeys(value);
    if(keys.length!==value.length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)))throw new Error('保存快照数组含额外字段。');
    return '['+Array.from({length:value.length},(_,index)=>{const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('保存快照数组不得包含空位或访问器。');return canonicalPlainJson(descriptor.value,depth+1);}).join(',')+']';
  }
  if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){
    const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw new Error('保存快照含无效属性键。');
    return '{'+(keys as string[]).sort().map(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('保存快照不得包含隐藏字段或访问器。');return JSON.stringify(key)+':'+canonicalPlainJson(descriptor.value,depth+1);}).join(',')+'}';
  }
  throw new Error('保存快照含非JSON值。');
}
