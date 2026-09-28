import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {css as additionCSS,renderAbout,renderGolaba} from './additions.mjs';
import {css as rcCSS,renderRC} from './rc.mjs';
import {css as honbotCSS,renderHonbot} from './honbot.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const source=path.join(here,'../portfolio-next');
const data=JSON.parse(fs.readFileSync(path.join(source,'deck-data.json'),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=relative=>{
  const file=path.resolve(root,relative);
  const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp'}[path.extname(file).toLowerCase()];
  if(!mime)throw Error(`Unsupported image: ${relative}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};
const picture=p=>asset(`outputs/portfolio-next/screens/${p.screen}`);
const section=(title,text)=>`<div class="detail"><h3>${title}</h3>${Array.isArray(text)?`<ol>${text.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:`<p>${esc(text).replaceAll('\n','<br>')}</p>`}</div>`;
const footer=p=>`<a class="github" href="${p.url}" target="_blank" rel="noopener">${p.url}</a>`;
const project=(p,i)=>`<div class="sheet" id="${p.id}"><section class="slide project ${p.layout}" style="--accent:${p.accent};--bg:${p.background}" contenteditable="true"><div class="signature"></div><div class="project-heading"><span class="number">${String(i+1).padStart(2,'0')}</span><h2>${esc(p.name)}</h2><p class="definition">${esc(p.definition)}</p><p class="subtitle">${esc(p.subtitle)}</p></div><figure class="app"><img src="${picture(p)}" alt="${esc(p.name)} 실제 실행 화면"><figcaption>${esc(p.caption)}</figcaption></figure><div class="details">${section('PAIN POINT',p.pain)}${section('SOLUTION',p.solution)}${section('ROLE',p.layout==='wide'?p.role.replaceAll('\n',' · '):p.role)}${section('TECH STACK',p.layout==='wide'?p.stack.replaceAll('\n',' · '):p.stack)}</div>${footer(p)}</section></div>`;
const projects=[...data,
  {id:'golaba',name:'GOLABA',subtitle:'신청 접수와 AI 서류 검토를 분리하는 지원사업 플랫폼'},
  {id:'honbot',name:'HONBOT',subtitle:'온라인 강의를 보며 모르는 내용을 바로 묻는 AI 학습 도우미'},
  {id:'rc-car',name:'RC카 자율주행',subtitle:'주행 장면과 조작값을 연결하는 CNN 기반 흰 선 추종'}
];
const css=[fs.readFileSync(path.join(source,'slides.css'),'utf8'),additionCSS,rcCSS,honbotCSS,fs.readFileSync(path.join(here,'final.css'),'utf8')].join('\n');
const js=fs.readFileSync(path.join(source,'editor.js'),'utf8');
const cover=`<div class="sheet" id="cover"><section class="slide cover bookend" contenteditable="true"><div class="bookend-label">PORTFOLIO</div><div class="cover-title"><h1>포트폴리오</h1><div class="bookend-rule"></div><p>장현진</p></div></section></div>`;
const contents=`<div class="sheet" id="contents"><section class="slide project-index" contenteditable="true"><h2>PROJECTS</h2><div class="index-list">${projects.map((p,i)=>`<a class="index-row" href="#${p.id}"><span>Project ${String(i+1).padStart(2,'0')}</span><h3>${esc(p.name)}</h3><p>${esc(p.subtitle)}</p></a>`).join('')}</div></section></div>`;
const outro=`<div class="sheet" id="github"><section class="slide bookend thanks" contenteditable="true"><div class="bookend-label">THANK YOU</div><h2 class="thanks-title">검토해 주셔서 감사합니다.</h2><div class="thanks-rule"></div><div class="thanks-contact"><div class="thanks-person"><h3>장현진</h3><a href="tel:01080621757">010-8062-1757</a><a href="mailto:jhn17577@gmail.com">jhn17577@gmail.com</a></div><div class="thanks-repository"><span>GITHUB · 전체 프로젝트 저장소</span><a href="https://github.com/KR-Nom/my-new-project-portfolio" target="_blank" rel="noopener">github.com/KR-Nom/my-new-project-portfolio <b aria-hidden="true">↗</b></a></div></div></section></div>`;
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="장현진 포트폴리오 — 경험·교육·수상 및 9개 프로젝트"><title>장현진 포트폴리오</title><style>${css}</style></head><body contenteditable="true"><div class="toolbar" contenteditable="false"><strong>장현진 포트폴리오</strong><button id="edit-toggle" type="button">편집 켜짐</button><button id="save-html" type="button">편집본 저장</button><button id="print" type="button" class="print">PDF로 저장</button><span class="sep"></span><button id="replace-image" type="button">이미지 교체</button><input type="file" id="image-upload" accept="image/*" hidden><label>이미지 <input id="image-size" type="range" min="30" max="100" value="100"></label><span class="save-status">본문을 클릭해 수정할 수 있습니다.</span></div><nav class="outline" aria-label="슬라이드 목차" contenteditable="false"><a href="#cover">장현진 포트폴리오</a><a href="#about">경험 · 교육 · 수상</a><a href="#contents">프로젝트 목차</a>${projects.map((p,i)=>`<a href="#${p.id}"><span>${String(i+1).padStart(2,'0')}</span>${esc(p.name)}</a>`).join('')}<a href="#github">감사 인사 · 연락처</a><small>문장을 클릭해 수정하세요.<br>이미지 선택 후 ⌘V로 교체할 수 있습니다.<br><br>PDF 저장 시 배경 그래픽을 켜고 브라우저 머리글·바닥글을 꺼 주세요.</small></nav><main>${cover}${renderAbout(asset)}${contents}${data.map(project).join('')}${renderGolaba(asset)}${renderHonbot(asset)}${renderRC(asset)}${outro}</main><div class="toast" contenteditable="false" hidden></div><script>${js}</script></body></html>`;
const target=process.argv[2]||path.join(root,'장현진_포트폴리오.html');
const backup=path.join(here,'before-html-update.html');
if(process.env.PORTFOLIO_SKIP_BACKUP!=='1'&&fs.existsSync(target)&&!fs.existsSync(backup))fs.copyFileSync(target,backup);
fs.writeFileSync(target,html);
console.log(JSON.stringify({target,slides:projects.length+4,bytes:Buffer.byteLength(html),selfContained:true}));
