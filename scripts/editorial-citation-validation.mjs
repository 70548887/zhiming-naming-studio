/** Publication-time integrity checks; semantic review remains a separately recorded editorial judgment. */
export function validateEditorialCitations(editorial,dataset){
 const fail=message=>{throw new Error('Naming editorial validation: '+message);};
 if(!editorial||typeof editorial.version!=='string'||!Array.isArray(editorial.citations))fail('missing version or citation rules');
 const characters=new Map(dataset.characters.map(c=>[c.char,c])),citations=new Map(dataset.citations.map(c=>[c.id,c])),names=new Set();
 let recombinedNames=0,continuousNames=0;
 for(const rule of editorial.citations){
  if(!rule||!Array.isArray(rule.names)||!rule.names.length||!rule.id||typeof rule.context!=='string'||!rule.context.trim()||typeof rule.excerpt!=='string'||!rule.excerpt.trim())fail('incomplete rule '+rule?.id);
  const known=citations.get(rule.id),bound=rule.citation;
  if(!known||!bound||['id','sourceId','title','chapter','text'].some(key=>bound[key]!==known[key]))fail('canonical citation identity differs: '+rule.id);
  if(!known.text.includes(rule.excerpt))fail('excerpt absent from original: '+rule.id);
  for(const name of rule.names){
   if(typeof name!=='string'||[...name].length!==2||names.has(name))fail('invalid or duplicate reviewed name: '+name);names.add(name);
   if([...name].some(char=>!rule.excerpt.includes(char)))fail('name character absent from reviewed excerpt: '+name);
   for(const char of name){const entry=characters.get(char),reading=rule.readings?.[char];if(!entry||!reading||entry.pinyin!==reading)fail('missing character or reading mismatch: '+name+'/'+char);if(!entry.readings?.some(r=>r.pinyin===reading&&r.meanings.length))fail('reading lacks source definitions: '+name+'/'+char);}
   if(rule.excerpt.includes(name))continuousNames++;
   else {recombinedNames++;if(!/重新组合|并非原文|非原文连词/.test(rule.context))fail('recombination needs explicit context: '+name);}
  }
 }
 return{rules:editorial.citations.length,names:names.size,continuousNames,recombinedNames,canonicalIdentitiesMatched:true,excerptsAndReadingsMatched:true};
}
