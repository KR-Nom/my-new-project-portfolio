import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePortfolio } from './content.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=dir;
const assetMap=JSON.parse(fs.readFileSync(path.join(dir,'assets.json'),'utf8'));
const imageCache=new Map();
function resolveAsset(relative){if(!assetMap[relative])throw Error('Missing asset '+relative);return path.join(dir,'assets',assetMap[relative]);}
function image(relative){if(!imageCache.has(relative)){const file=resolveAsset(relative);const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'}[path.extname(file)];if(!mime)throw Error('Unsupported image');imageCache.set(relative,`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`);}return imageCache.get(relative);}
const {slides,evidence}=makePortfolio(image);
const css=fs.readFileSync(path.join(dir,'webtoon.css'),'utf8')+'\n'+fs.readFileSync(path.join(dir,'portfolio.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'editor.js'),'utf8');
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>장현진 포트폴리오</title><meta name="description" content="장현진의 AI 시스템 설계, 모델 학습, 서비스 구현 포트폴리오"><style>${css}</style></head>
<body contenteditable="true"><div class="toolbar" contenteditable="false"><strong>장현진 포트폴리오</strong><button id="print" class="primary">PDF로 저장</button><button id="save-html">편집본 저장</button><button id="edit-toggle">편집 켜짐</button><span class="spacer"></span><span class="save-status">이미지가 포함된 단일 HTML</span><button id="replace-image">이미지 교체</button><label class="image-control">크기 <input id="image-size" type="range" min="30" max="100" value="100" aria-label="선택 이미지 크기"></label><button id="evidence-toggle">반영 자료</button><input id="image-upload" type="file" accept="image/*" hidden></div>
<nav class="outline" contenteditable="false" aria-label="프로젝트 목차"><b>장현진 포트폴리오</b>${slides.map((s,i)=>`<a href="#slide-${i+1}">${s.name}</a>`).join('')}<p class="help">16:9 가로 슬라이드<br>문장을 클릭해 수정할 수 있습니다.<br>이미지 선택 후 ⌘V로 교체.<br>PDF 인쇄 시 편집 도구는 숨겨집니다.</p></nav>
<main class="deck">${slides.map((s,i)=>`<div class="sheet" id="slide-${i+1}"><section class="slide ${s.class||''}" contenteditable="true" data-title="${s.name}">${s.html}</section></div>`).join('\n')}</main>
<aside class="evidence-drawer" hidden contenteditable="false"><button id="evidence-close">닫기</button><h2>반영 자료와 표현 범위</h2><p>이 패널은 PDF에 인쇄되지 않습니다. 대표 화면 중 UI 재구성은 확인한 코드와 입력·출력 흐름을 시각화한 것입니다. 저장된 실행 수치는 실험 조건과 함께 본문에 표기했습니다.</p>${evidence.map(e=>`<h3>${e.title}</h3><p>${e.note}</p><code>${e.files.join('<br>')}</code>`).join('')}<h3>파일과 인쇄</h3><p>이미지를 모두 HTML에 포함했습니다. 외부 서버 없이 열 수 있습니다. 50MB 업로드 제한을 고려해 불필요한 원본 PDF·중복 이미지는 첨부하지 않았습니다. 인쇄 설정에서 배경 그래픽을 켜고 머리글·바닥글을 끄세요.</p></aside><div class="toast" hidden contenteditable="false" role="status"></div><script contenteditable="false">${js}</script></body></html>`;
const target=path.join(root,'index.html');
fs.writeFileSync(target,html);
fs.writeFileSync(path.join(dir,'asset-manifest.json'),JSON.stringify({slides:slides.length,htmlBytes:Buffer.byteLength(html),uniqueImages:imageCache.size,images:[...imageCache.keys()]},null,2));
console.log(JSON.stringify({slides:slides.length,htmlMB:(Buffer.byteLength(html)/1e6).toFixed(2),images:imageCache.size,target}));
