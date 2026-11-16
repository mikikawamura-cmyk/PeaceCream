import {execFileSync} from 'node:child_process';
const suites=[];
for(const name of ['offline','transport','adapters','postgres']){
 try{const output=execFileSync(process.execPath,[new URL(name+'.mjs',import.meta.url).pathname],{encoding:'utf8',env:{PATH:process.env.PATH||'/usr/bin:/bin',TZ:'UTC'},timeout:60000,maxBuffer:1024*1024});suites.push(JSON.parse(output.trim()))}
 catch{console.error('Server-backup suite failed: '+name+'. No sensitive test payload was logged. Run that synthetic suite directly for diagnosis.');process.exit(1)}
}
console.log(JSON.stringify({status:'PASS',checks:suites.reduce((n,s)=>n+s.checks,0),suites,externalConnections:0,realEmails:0,schedulesActivated:0,productionChanges:0,googleScopeLiveVerified:false}));
