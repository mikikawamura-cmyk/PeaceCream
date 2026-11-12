// Run only on a trusted operator/scheduler host. No credentials in command arguments.
// Usage: node scripts/backup.mjs backup|journal /secure/path/new-archive.pcenc
import{readFile,writeFile,stat}from'node:fs/promises';import{createRequire}from'node:module';import{seal}from'./backup-crypto.mjs';
const require=createRequire(import.meta.url),{database}=require('../lib/database.cjs');
try{const [kind,destination,...extra]=process.argv.slice(2);if(!['backup','journal'].includes(kind)||!destination||extra.length)throw Error('Use backup|journal and a new encrypted archive path.');
 const project=process.env.PC_BACKUP_PROJECT_REF;if(!/^[a-z0-9]{20}$/.test(project||'')||process.env.SUPABASE_URL!=='https://'+project+'.supabase.co')throw Error('The approved backup project reference must match the database URL.');
 const path=process.env.PC_BACKUP_KEY_FILE;if(!path)throw Error('Configure PC_BACKUP_KEY_FILE on the trusted host.');const st=await stat(path);if(!st.isFile()||(st.mode&0o077))throw Error('Backup key file must be private (0600 or stricter).');const key=await readFile(path);if(key.length!==32)throw Error('Backup key file must contain exactly 32 random bytes.');
 const snapshot=await database().rpc('pc_recovery_snapshot',{p_kind:kind});const archive={project,createdAt:new Date().toISOString(),snapshot};const encrypted=seal(archive,key);key.fill(0);await writeFile(destination,encrypted,{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({ok:true,kind,project,bytes:encrypted.length,submissions:snapshot.tables.pc_submissions?.length??null,deletions:snapshot.deletions.length,warning:'Copy this encrypted archive to the approved independent storage; this command does not schedule, upload or enforce storage expiry.'}));
}catch{console.error('Backup failed. Check the trusted-host configuration and alert the operations owner. No sensitive error details were logged.');process.exitCode=1}
