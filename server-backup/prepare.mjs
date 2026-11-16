import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
await writeFile(new URL('apps-script/Protocol.gs',root),await readFile(new URL('protocol.cjs',root)));
console.log('Prepared identical shared protocol source only. No deployment or connections.');
