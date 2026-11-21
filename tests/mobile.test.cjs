const {chromium}=require('playwright');const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve('public');let browser;
 const server=http.createServer((req,res)=>{try{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(file===root+'/')file=path.join(root,'index.html');if(!file.startsWith(root+path.sep))throw Error();const mime=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.webp')?'image/webp':'application/octet-stream';res.setHeader('Content-Type',mime);res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 try{
 await new Promise(resolve=>server.listen(35669,'127.0.0.1',resolve));
 browser=await chromium.launch({...(process.env.BIOVAULT_CHROMIUM_PATH?{executablePath:process.env.BIOVAULT_CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 // Block external services: the interface and local measurements must work offline.
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:35669/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:35669/');await page.getByRole('heading',{name:'Seu corpo. Sua evolução.'}).waitFor();
 assert(await page.locator('#appRoot').evaluate(e=>e.inert));assert(await page.getByRole('button',{name:'Entrar na minha conta',exact:true}).isVisible());
 await page.screenshot({path:'build/login-mobile.png'});
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();assert(await page.getByLabel('Como você se chama?',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Continuar somente neste aparelho'}).click();
 assert(!(await page.locator('#appRoot').evaluate(e=>e.inert)));
 assert.equal(await page.locator('#homeWeight').textContent(),'Sem pesagem');
 assert.equal(await page.locator('#homeHeight').textContent(),'Não informada');
 await page.locator('#homeAddWeighing').click();
 for(const[id,value]of Object.entries({mPersonName:'Pessoa de teste',mAge:'28',mHeight:'165',mWeight:'65'}))await page.locator('#'+id).fill(value);
 await page.locator('#mSex').selectOption('F');await page.locator('#btnSaveWeighing').click();await page.locator('#newWeighingModal.hidden').waitFor();
 await page.getByRole('button',{name:'Definir mais tarde',exact:true}).click();
 assert.equal(await page.locator('#personContextName').textContent(),'Oi, Pessoa!');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('biovault_local_readings')));assert.equal(saved.length,1);assert.equal(saved[0].weight,65);assert.equal(saved[0].equipment,null);
 assert.equal(await page.locator('#homeWeight').textContent(),'65.0 kg');
 assert.equal(await page.locator('#bottomNav').evaluate(e=>getComputedStyle(e).position),'static');
 assert.deepEqual(await page.locator('#bottomNav button span').allTextContents(),['Inicial','Comparações gráficas','Treino','Configuração']);
 for(const width of [360,393,768]){await page.setViewportSize({width,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`build/dashboard-${width}.png`,fullPage:true});}
 await page.locator('#bottomNav [data-app-nav="training"]').click();await page.locator('#trainingModal:not(.hidden)').waitFor();assert.match(await page.locator('#trainingSummary').textContent(),/Última pesagem/);await page.getByRole('button',{name:'Fechar treino',exact:true}).click();
 await page.locator('#bottomNav [data-app-nav="chart"]').click();await page.locator('#quickPanelBody #subView-chart').waitFor();await page.keyboard.press('Escape');
 await page.reload();await page.getByRole('button',{name:'Continuar somente neste aparelho'}).click();assert.equal(await page.locator('#personContextName').textContent(),'Oi, Pessoa!');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();assert(await page.locator('#appRoot').evaluate(e=>e.inert));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,viewports:[360,393,768],offlineInterface:true,productionWrites:0}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
