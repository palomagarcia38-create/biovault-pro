import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
await fs.mkdir('public/vendor',{recursive:true});
await fs.mkdir('build',{recursive:true});
const entryPoints={};
for (const [file,module] of [['firebase-app','firebase/app'],['firebase-firestore','firebase/firestore'],['firebase-auth','firebase/auth']]) {
  const input=`build/${file}.mjs`;
  await fs.writeFile(input,`export * from '${module}';`);
  entryPoints[file]=input;
}
// Shared chunks keep a single Firebase component registry across all SDKs.
await build({entryPoints,bundle:true,splitting:true,format:'esm',minify:true,outdir:'public/vendor',chunkNames:'chunks/[name]-[hash]',target:['es2020'],legalComments:'eof'});
await fs.copyFile('node_modules/chart.js/dist/chart.umd.js','public/vendor/chart.umd.js');
await fs.cp('node_modules/@fortawesome/fontawesome-free/css/all.min.css','public/vendor/fontawesome.css');
await fs.cp('node_modules/@fortawesome/fontawesome-free/webfonts','public/webfonts',{recursive:true});
await fs.mkdir('build',{recursive:true});
await fs.writeFile('build/tailwind.css','@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','build/tailwind.css','-o','public/vendor/tailwind.css','--content','public/index.html','--minify'],{stdio:'inherit'});
const destination='android/app/src/main/assets/www';
await fs.mkdir(destination,{recursive:true});
await fs.cp('public',destination,{recursive:true,filter:p=>!p.includes(path.sep+'updates')});
console.log('Web assets ready, including offline styles, charts and Firebase SDKs.');
