const need=(ok,message)=>{if(!ok)throw new Error(message);};
export function regressionCounts(value){
 need(value?.success===true&&value.numFailedTests===0&&value.numFailedTestSuites===0&&value.numPendingTests===0&&(value.numTodoTests??0)===0,'Vitest did not report a fully passed run');
 need(Array.isArray(value.testResults)&&value.testResults.length>0,'Vitest file results missing');
 const names=new Set();let tests=0;
 for(const file of value.testResults){need(typeof file.name==='string'&&!names.has(file.name)&&file.status==='passed'&&Array.isArray(file.assertionResults)&&file.assertionResults.length>0,'Vitest file is failed, duplicate or empty');names.add(file.name);for(const test of file.assertionResults){need(test.status==='passed','Vitest contains a non-passed assertion');tests++;}}
 need(tests>0&&value.numTotalTests===tests&&value.numPassedTests===tests,'Vitest totals disagree with assertions');
 return {files:value.testResults.length,tests,failed:0};
}
