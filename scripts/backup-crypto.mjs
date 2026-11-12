// Offline application archives. Never imported by browser code or API handlers.
import{createCipheriv,createDecipheriv,randomBytes}from'node:crypto';
const magic=Buffer.from('PeaceCreamBackup1\n');
export function seal(value,key){if(key.length!==32)throw Error('A 32-byte backup key is required.');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);const payload=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([magic,iv,cipher.getAuthTag(),payload])}
export function unseal(bytes,key){if(bytes.length<magic.length+28||!bytes.subarray(0,magic.length).equals(magic)||key.length!==32)throw Error('Invalid archive.');const start=magic.length,decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(start,start+12));decipher.setAAD(magic);decipher.setAuthTag(bytes.subarray(start+12,start+28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(start+28)),decipher.final()]).toString('utf8'))}
