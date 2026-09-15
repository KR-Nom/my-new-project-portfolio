import {readFile, writeFile, mkdir} from 'node:fs/promises';

// Connect only to the isolated agent-browser session supplied on the command line.
const [port, mode = 'capture'] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.includes('127.0.0.1:5174'));
if (!target) throw new Error('Open the local presentation/app in the isolated browser first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, {once:true}));
let seq=0; const pending=new Map();
socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(pending.has(msg.id)){const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);msg.error?reject(new Error(JSON.stringify(msg.error))):resolve(msg.result);}});
function send(method,params={}) {return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+expression);}
async function navigate(path,ready){await send('Page.navigate',{url:`http://127.0.0.1:5174${path}`});await until(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`);if(ready)await until(ready);await evaluate('document.fonts.ready.then(()=>true)');}
async function capture(name,selector,maxHeight){await evaluate('scrollTo({top:0,left:0,behavior:"instant"});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const clip=await evaluate(`(()=>{const boxes=[...document.querySelectorAll(${JSON.stringify(selector)})].map(e=>e.getBoundingClientRect()); if(!boxes.length)throw new Error('Missing capture element');const x=Math.min(...boxes.map(r=>r.x)),y=Math.min(...boxes.map(r=>r.y));return {x:x+scrollX,y:y+scrollY,width:Math.max(...boxes.map(r=>r.right))-x,height:Math.max(...boxes.map(r=>r.bottom))-y,scale:1};})()`);if(maxHeight)clip.height=Math.min(clip.height,maxHeight);const result=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});await writeFile(`report-assets/redesign/${name}.png`,Buffer.from(result.data,'base64'));console.log(name,clip);}
await mkdir('report-assets/redesign',{recursive:true});
await send('Emulation.setDeviceMetricsOverride',{width:['verify','preview'].includes(mode)?1472:1280,height:1100,deviceScaleFactor:2,mobile:false});
if(mode==='refresh-ui'){
 // Capture visible, unmodified app UI. A dedicated browser session keeps user data untouched.
 await send('Runtime.enable');
 await send('Network.enable');
 const requests = [], errors = [], shareChecks = [];
 socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  if(message.method==='Network.responseReceived' && message.params.response.url.includes('/api/')){
   const r=message.params.response;requests.push({path:new URL(r.url).pathname,status:r.status,serviceWorker:!!r.fromServiceWorker});
  }
 });
 await navigate('/login','!!document.querySelector(".auth-card")');
 await capture('ui-login','.auth-card');
 await evaluate('document.querySelector(".auth-card button").click()');await until('location.pathname === "/" && !!document.querySelector(".welcome-panel")');
 await navigate('/profile/edit','!!document.querySelector(".editor-stepper")');
 await evaluate('document.querySelectorAll(".editor-stepper button")[1].click()');
 await until('document.querySelector(".step-panel-heading").innerText.includes("협업 방식")');
 await evaluate('new Promise(r=>setTimeout(r,500))');
 await capture('ui-profile-stepper','.editor-stepper');
 await capture('ui-profile-style','.step-panel:not([style*="display: none"]) .form-section:first-child');
 await navigate('/join/SKALA3','!!document.querySelector(".invitation")');
 await capture('ui-team-join','.narrow .form-section,.invitation');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:2,mobile:false});
 await navigate('/teams/1','document.querySelectorAll(".member-card").length === 5');
 await capture('ui-board-pair','.member-card:nth-child(-n+2)');
 await capture('ui-board-toolbar','.member-toolbar');
 await capture('ui-team-invite-trigger','.team-hero');
 await evaluate('[...document.querySelectorAll("button")].find(b=>b.innerText.includes("팀원 초대")).click()');
 await until('!!document.querySelector(".qr-image")');
 await evaluate('new Promise(r=>setTimeout(r,250))');
 await capture('ui-team-share','.modal');
 shareChecks.push(await evaluate('({kind:"team",url:document.querySelector(".copy-field input").value,code:document.querySelector(".invite-code").innerText,qrLoaded:document.querySelector(".qr-image").naturalWidth>0})'));
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:2,mobile:false});
 await navigate('/teams/1/me/edit','!!document.querySelector(".role-priority-list")');
 await capture('ui-role-goal-editor','.role-priority-list,.editor .form-section:nth-child(2)');
 await navigate('/teams/1/members/2','!!document.querySelector(".team-context")');
 await capture('ui-member-team-focus','.team-context .detail-role');
 await capture('ui-member-styles','.profile-grid');
 await capture('ui-member-question','.conversation > p:last-child');
 await navigate('/profile/preview','!!document.querySelector(".profile-grid")');
 await capture('ui-my-profile-intro','.profile-hero,.profile-grid .card:nth-child(-n+2)');
 await capture('ui-my-profile-share','.share-bar');
 await evaluate('[...document.querySelectorAll(".share-bar button")].find(b=>b.innerText.includes("QR로 공유")).click()');
 await until('!!document.querySelector(".qr-image")');
 await evaluate('new Promise(r=>setTimeout(r,250))');
 await capture('ui-profile-share','.modal');
 shareChecks.push(await evaluate('({kind:"profile",url:document.querySelector(".copy-field input").value,qrLoaded:document.querySelector(".qr-image").naturalWidth>0})'));
 // Check the actual copy control with browser-granted clipboard permission.
 await send('Browser.grantPermissions',{origin:'http://127.0.0.1:5174',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await evaluate('document.querySelector(".copy-field button").click()');
 await until('document.querySelector(".copy-field button").innerText.includes("복사 완료")');
 shareChecks.push(await evaluate('navigator.clipboard.readText().then(clipboard=>({kind:"profile-copy",clipboard,success:clipboard===document.querySelector(".copy-field input").value}))'));
 await capture('ui-profile-copy','.copy-field,.share-info small');
 // Verify the recipient view without a signed-in account in this isolated session.
 await evaluate('localStorage.removeItem("manual_user")');
 await navigate('/p/hyeonjin','!!document.querySelector(".profile-grid")');
 shareChecks.push(await evaluate('({kind:"public-recipient",path:location.pathname,guest:!localStorage.getItem("manual_user"),name:document.querySelector(".profile-hero h1").innerText})'));
 await capture('ui-public-profile','.profile-hero,.profile-grid .card:nth-child(-n+2)');
 await send('Emulation.setDeviceMetricsOverride',{width:700,height:1100,deviceScaleFactor:2,mobile:false});
 await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await capture('ui-public-hero','.profile-hero');
 await capture('ui-public-style','.profile-grid .card:nth-child(2)');
 await writeFile('report-assets/redesign/ui-capture-checks.json',JSON.stringify({requests,errors,shareChecks},null,2));
 console.log(JSON.stringify({errors,shareChecks},null,2));
} else if(mode==='capture'){
 await navigate('/login','!!document.querySelector(".auth-card")');
 await capture('login','.auth-card');
 await evaluate('document.querySelector(".auth-card button").click()');await until('location.pathname === "/"');
 await navigate('/profile/edit','document.querySelectorAll(".editor .form-section").length > 5');
 await capture('profile-style','.editor .form-section:nth-child(2),.editor .form-section:nth-child(3)');
 await navigate('/join/SKALA3','!!document.querySelector(".invitation")');
 await capture('team-join','.narrow .form-section,.invitation');
 await navigate('/teams/1','document.querySelectorAll(".member-card").length === 5');
 await capture('board-pair','.member-card:nth-child(-n+2)');
 await capture('board-all','.member-grid');
 await navigate('/teams/1/members/2','!!document.querySelector(".team-context")');
 await capture('member-team','.team-context');
 await capture('member-profile','.profile-grid,.conversation');
 await navigate('/api-docs','document.querySelectorAll(".opblock").length === 20');
 console.log('swagger operations',await evaluate('[...document.querySelectorAll(".opblock")].map(e=>({id:e.id,text:e.querySelector(".opblock-summary-path")?.textContent}))'));
} else if(mode==='story'){
 await navigate('/login','!!document.querySelector(".auth-card")');
 await evaluate('document.querySelector(".auth-card button").click()');
 await until('location.pathname === "/"');
 await navigate('/teams/1/me/edit','document.querySelectorAll(".editor .form-section").length === 3');
 await capture('role-goal-editor','.editor .form-section:nth-child(1),.editor .form-section:nth-child(2)');
 await navigate('/profile/preview','!!document.querySelector(".profile-grid")');
 await capture('my-profile-intro','.profile-hero,.profile-grid .card:nth-child(-n+2)');
 await capture('my-profile-share','.share-bar');
 console.log('Story screens verified',await evaluate('({profile:document.querySelector(".profile-hero h1").innerText,shareButtons:[...document.querySelectorAll(".share-bar button")].map(b=>b.innerText),overlay:!!document.querySelector("vite-error-overlay")})'));
} else if(mode==='profile'){
 await navigate('/profile/edit','document.querySelectorAll(".editor .form-section").length > 5');
 await evaluate('scrollTo(0,450);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await capture('profile-style','.editor .form-section:nth-child(2),.editor .form-section:nth-child(3)');
} else if(mode==='detail'){
 await navigate('/teams/1/members/2','!!document.querySelector(".team-context")');
 await capture('member-team-focus','.team-context .role-list,.team-context h2:nth-of-type(2),.team-context .quote');
 await capture('member-styles','.profile-grid');
 await capture('member-question','.conversation > p:last-child');
} else if(mode==='swagger'){
 await capture('swagger-request','#operations-Team_Member-get_teams__teamId__members .opblock-summary, #operations-Team_Member-get_teams__teamId__members .parameters-container, #operations-Team_Member-get_teams__teamId__members .btn-group');
 await capture('swagger-response','.request-url,.live-responses-table',410);
 console.log(await evaluate('document.querySelector(".live-responses-table tbody .response-col_status").innerText'));
} else if(mode==='catalog'){
 await send('Emulation.setDeviceMetricsOverride',{width:900,height:1100,deviceScaleFactor:2,mobile:false});
 await navigate('/api-docs','document.querySelectorAll(".opblock").length === 20');
 await capture('swagger-info','.swagger-ui .information-container,.swagger-ui .scheme-container');
 const tags=await evaluate('[...document.querySelectorAll(".opblock-tag-section")].map((e,i)=>{e.dataset.captureTag=i+1;return {index:i+1,name:e.querySelector("h3").getAttribute("data-tag"),count:e.querySelectorAll(".opblock").length}})');
 for(const tag of tags)await capture('swagger-tag-'+tag.name.toLowerCase().replaceAll(' ','-'),`[data-capture-tag="${tag.index}"] .opblock`);
 await capture('swagger-schemas-all','.swagger-ui section.models');
 await evaluate('document.querySelector("#model-MemberDetail .model-box-control").click()');
 await until('document.querySelector("#model-MemberDetail").getBoundingClientRect().height >= 267');
 await evaluate('[...document.querySelectorAll("#model-MemberDetail .property-row")].filter(r=>["id","teamId","userId"].includes(r.firstElementChild.innerText)).forEach(r=>r.querySelector("button").click())');
 await until('document.querySelector("#model-MemberDetail").innerText.includes("integer")');
 await evaluate('new Promise(resolve=>setTimeout(resolve,300))');
 await capture('swagger-schema-memberdetail','#model-MemberDetail');
 await evaluate('document.querySelector("#model-Error .model-box-control").click()');
 await until('document.querySelector("#model-Error").getBoundingClientRect().height >= 102');
 await evaluate('document.querySelector("#model-Error .property-row button").click()');
 await until('document.querySelector("#model-Error").innerText.includes("string")');
 await evaluate('new Promise(resolve=>setTimeout(resolve,300))');
 await capture('swagger-schema-error','#model-Error');
 await evaluate('document.querySelector(".auth-wrapper .authorize").click()');
 await until('!!document.querySelector(".dialog-ux")');
 await capture('swagger-auth','.dialog-ux .modal-ux');
 await evaluate('document.querySelector(".dialog-ux .close-modal").click()');
 await writeFile('report-assets/redesign/swagger-catalog-checks.json',JSON.stringify({tags,operations:tags.reduce((n,t)=>n+t.count,0)},null,2));
} else if(mode==='preview'){
 // Review the changed story pages before replacing the presentation PDF.
 await navigate('/HowToDo_presentation_report.html','document.querySelectorAll(".slide").length === 25');
 await until('[...document.images].every(i=>i.complete && i.naturalWidth > 0)');
 for(const page of [6,7,9,11,13,14,18])await capture(`slide-${String(page).padStart(2,'0')}`,`.slide:nth-of-type(${page})`);
} else if(mode==='verify'){
 await navigate('/HowToDo_presentation_report.html','document.querySelectorAll(".slide").length === 25');
 await until('[...document.images].every(i=>i.complete && i.naturalWidth > 0)');
 const checks=await evaluate(`(()=>{const slides=[...document.querySelectorAll('.slide')];return {slides:slides.length,brokenImages:[...document.images].filter(i=>!i.naturalWidth).length,overflow:slides.flatMap((s,i)=>{const r=s.getBoundingClientRect();return [...s.querySelectorAll('h1,h2,h3,p,li,img,svg,code,pre,td,th,figcaption,.lane-step,.message,.diagram')].filter(e=>{const b=e.getBoundingClientRect();return b.bottom>r.bottom+1||b.right>r.right+1||b.left<r.left-1}).map(e=>({slide:i+1,element:e.tagName,text:e.textContent.slice(0,50)}))}),sizes:slides.map(s=>[s.offsetWidth,s.offsetHeight]),fonts:[...new Set([...document.querySelectorAll('.slide p,.slide li,.slide code')].map(e=>getComputedStyle(e).fontSize))]};})()`);
 console.log(JSON.stringify(checks,null,2));await writeFile('report-assets/redesign/browser-checks.json',JSON.stringify(checks,null,2));
 const overlaps=await evaluate(`(()=>{const hits=[];for(const api of document.querySelectorAll('.ui-api')){const a=api.getBoundingClientRect();for(const img of api.closest('.slide').querySelectorAll('img')){const b=img.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)hits.push(api.closest('.slide').dataset.title);}}return hits;})()`);
 console.log('Endpoint/image overlaps',overlaps);
 const noteOverlaps=await evaluate(`(()=>{const hits=[];for(const note of document.querySelectorAll('.bottom-note,.catalog-caption')){const a=note.getBoundingClientRect();for(const e of note.closest('.slide').querySelectorAll('p,pre,img')){if(e===note)continue;const b=e.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)hits.push({slide:note.closest('.slide').dataset.title,element:e.tagName});}}return hits;})()`);
 checks.noteOverlaps=noteOverlaps;
 await writeFile('report-assets/redesign/browser-checks.json',JSON.stringify(checks,null,2));
 console.log('Bottom note overlaps',noteOverlaps);
 if(noteOverlaps.length)throw new Error('Bottom note overlaps content');

 // The actor diagram must cover actual service routes without overlapping screen boxes.
 const actorFlow=await evaluate(`(()=>{const panels=[...document.querySelectorAll('.actor-flow-panel')];const overlaps=[],contentOverflow=[];for(const panel of panels){const nodes=[...panel.querySelectorAll('.flow-screen')];for(let i=0;i<nodes.length;i++){const a=nodes[i].getBoundingClientRect();for(const label of nodes[i].querySelectorAll('strong,code,.screen-note')){const b=label.getBoundingClientRect();if(b.left<a.left-1||b.right>a.right+1||b.top<a.top-1||b.bottom>a.bottom+1)contentOverflow.push(label.textContent);}for(let j=i+1;j<nodes.length;j++){const b=nodes[j].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push([nodes[i].textContent,nodes[j].textContent]);}}}return {panels:panels.length,screenBoxes:document.querySelectorAll('.flow-screen').length,routes:[...new Set([...document.querySelectorAll('.flow-screen[data-route]')].map(e=>e.dataset.route))],overlaps,contentOverflow};})()`);
 const routerSource=await readFile('src/router/index.js','utf8');
 const serviceRoutes=[...routerSource.matchAll(/path:\s*'([^']+)'/g)].map(match=>match[1]).filter(route=>route!=='/api-docs');
 actorFlow.missingRoutes=serviceRoutes.filter(route=>!actorFlow.routes.includes(route));
 actorFlow.unknownRoutes=actorFlow.routes.filter(route=>!serviceRoutes.includes(route));
 await writeFile('report-assets/redesign/ui-flow-checks.json',JSON.stringify(actorFlow,null,2));
 console.log('Actor flow',JSON.stringify(actorFlow));
 if(actorFlow.panels!==4||actorFlow.overlaps.length||actorFlow.contentOverflow.length||actorFlow.missingRoutes.length||actorFlow.unknownRoutes.length)throw new Error('Actor flow validation failed');

 // Both entry paths must join the complete journey, with a shortcut for existing team members.
 const onboardingFlow=await evaluate(`(()=>{const flow=document.querySelector('.onboarding-ui-flow');const nodes=[...flow.querySelectorAll('.onboarding-node')];const map=flow.querySelector('.journey-map').getBoundingClientRect();const overlaps=[],contentOverflow=[];for(let i=0;i<nodes.length;i++){const a=nodes[i].getBoundingClientRect();if(a.left<map.left||a.right>map.right||a.top<map.top||a.bottom>map.bottom)contentOverflow.push(nodes[i].dataset.node);for(const label of nodes[i].querySelectorAll('strong,small')){const b=label.getBoundingClientRect();if(b.left<a.left||b.right>a.right||b.top<a.top||b.bottom>a.bottom)contentOverflow.push(label.textContent);}for(let j=i+1;j<nodes.length;j++){const b=nodes[j].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push([nodes[i].dataset.node,nodes[j].dataset.node]);}}const edges=[...flow.querySelectorAll('path[data-from]')].map(e=>({from:e.dataset.from,to:e.dataset.to,condition:e.dataset.condition||null}));const ids=nodes.map(n=>n.dataset.node);const unknownNodes=edges.filter(e=>!ids.includes(e.from)||!ids.includes(e.to));const path=start=>{const visited=[];let current=start;while(current&&!visited.includes(current)){visited.push(current);current=edges.find(e=>e.from===current&&!e.condition)?.to;}return visited;};return {screenBoxes:nodes.length,contentOverflow,overlaps,unknownNodes,screenshotsAboveFlow:[...document.querySelectorAll('.onboarding-screens img')].every(img=>img.getBoundingClientRect().bottom<flow.getBoundingClientRect().top),firstVisitPath:path('signup'),returningPath:path('login'),existingTeamShortcut:edges.some(e=>e.from==='home'&&e.to==='board'&&e.condition==='existing-team')};})()`);
 checks.onboardingFlow=onboardingFlow;
 if(onboardingFlow.screenBoxes!==7||onboardingFlow.contentOverflow.length||onboardingFlow.overlaps.length||onboardingFlow.unknownNodes.length||!onboardingFlow.screenshotsAboveFlow||!onboardingFlow.existingTeamShortcut||JSON.stringify(onboardingFlow.firstVisitPath)!==JSON.stringify(['signup','profile','home','team','board','detail'])||JSON.stringify(onboardingFlow.returningPath)!==JSON.stringify(['login','home','team','board','detail']))throw new Error('Onboarding flow validation failed');

 // Inspect the SVG's actual font metrics; an image's outer bounds alone cannot detect colliding ERD labels.
 const erdLayout=await evaluate(`(async()=>{const source=await (await fetch('report-assets/redesign/full-erd.svg')).text();const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:1312px;height:570px;visibility:hidden';host.innerHTML=source;document.body.append(host);try{await document.fonts.ready;const groups=[...host.querySelector('svg').children].filter(e=>e.tagName==='g'&&e.hasAttribute('transform')&&e.querySelector('.card'));const overflow=[],overlaps=[];for(const group of groups){const card=group.querySelector('.card').getBoundingClientRect();const labels=[...group.querySelectorAll('text')];for(let i=0;i<labels.length;i++){const a=labels[i].getBoundingClientRect();if(a.left<card.left||a.right>card.right||a.top<card.top||a.bottom>card.bottom)overflow.push(group.getAttribute('aria-label')+'.'+labels[i].textContent);for(let j=i+1;j<labels.length;j++){const b=labels[j].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push(group.getAttribute('aria-label')+': '+labels[i].textContent+' / '+labels[j].textContent);}}}return {tables:groups.length,overflow,overlaps};}finally{host.remove();}})()`);
 checks.erdLayout=erdLayout;
 console.log('Onboarding flow',JSON.stringify(onboardingFlow));
 console.log('ERD typography',JSON.stringify(erdLayout));
 if(erdLayout.tables!==8||erdLayout.overflow.length||erdLayout.overlaps.length)throw new Error('ERD typography validation failed');

 // Production notes belong in validation records, not in the audience-facing copy.
 const editorialFlags=await evaluate(`(()=>{const phrases=['발췌','실제 화면','실제 서비스 화면','사용자 제공','분할 배치','예시 그림','명 중 2명 확대'];return [...document.querySelectorAll('.slide')].flatMap((slide,index)=>phrases.filter(phrase=>slide.innerText.replace(/\\s+/g,'').includes(phrase.replace(/\\s+/g,''))).map(phrase=>({slide:index+1,phrase})));})()`);
 checks.editorialFlags=editorialFlags;
 await writeFile('report-assets/redesign/browser-checks.json',JSON.stringify(checks,null,2));
 if(editorialFlags.length)throw new Error('Presentation contains production-oriented copy: '+JSON.stringify(editorialFlags));

 if(checks.overflow.length||checks.brokenImages||overlaps.length)throw new Error('Presentation layout failed');
 for(let i=1;i<=checks.slides;i++)await capture(`slide-${String(i).padStart(2,'0')}`,`.slide:nth-of-type(${i})`);
 await send('Emulation.setEmulatedMedia',{media:'print'});
 if(!await evaluate('getComputedStyle(document.querySelector(".toolbar")).display === "none"'))throw new Error('Editor toolbar must not appear in print');
 const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0});
 await mkdir('산출물',{recursive:true});
 await writeFile('산출물/1반_장현진_HowToDo-개요.pdf',Buffer.from(pdf.data,'base64'));
 await send('Emulation.setEmulatedMedia',{media:''});
 console.log('PDF exported');
}
socket.close();
