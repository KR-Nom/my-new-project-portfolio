import {coverSlide} from './cover.mjs';
import {projectLinks,githubProfile,portfolioRepository} from './project-links.mjs';
import { aiProjects } from './projects-ai.mjs';
import { productProjects } from './projects-product.mjs';
import { webtoonProject } from './project-webtoon.mjs';
export function makePortfolio(image){
 const slides=[],evidence=[];
 const img=(p,alt,cls='screenshot')=>`<img class="${cls}" src="${image(p)}" alt="${alt}" draggable="false">`;
 const badge=(t,c='')=>`<span class="badge ${c}">${t}</span>`;
 const stats=a=>`<div class="stats">${a.map(v=>`<div class="stat"><small>${v[0]}</small><strong>${v[1]}</strong></div>`).join('')}</div>`;
 const table=(head,rows)=>`<table class="ui-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 const flow=a=>`<div class="ui-flow">${a.map(x=>`<b>${x}</b>`).join('<span>→</span>')}</div>`;
 const app=(name,menu,body)=>`<div class="screen-card"><div class="app-chrome"><i></i><i></i><i></i><span>${name.replace(/<[^>]+>/g,'')}</span></div><div class="app">${menu.length?`<div class="app-side"><div class="app-logo">${name}</div>${menu.map((x,i)=>`<div class="app-menu ${i===0?'on':''}">${x}</div>`).join('')}</div>`:''}<div class="app-body">${body}</div></div></div>`;
 const bar=(label,value,width,color='')=>`<div><div class="bar-label"><span>${label}</span><b>${value}</b></div><div class="bar-track"><div class="bar-fill ${color}" style="width:${width}%"></div></div></div>`;
 const tags=a=>`<div class="tags">${a.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`;
 const features=a=>`<div class="feature-strip">${a.map((f,i)=>`<div><span>${['→','↗','✓'][i]}</span><p><b>${f[0]}</b>${f[1]}</p></div>`).join('')}</div>`;
 const storyList=t=>'<ol class="story-list">'+(Array.isArray(t)?t:[t]).map(x=>'<li data-edit>'+x+'</li>').join('')+'</ol>';
 function project(p){const link=projectLinks[p.name];if(!link)throw Error('Missing project link '+p.name);slides.push({name:p.name,preview:p.visual,caption:p.caption,class:p.class||'',html:`<div class="heading"><div><p class="eyebrow">${p.kicker}</p><h2 data-edit>${p.title}</h2><p class="sub" data-edit>${p.subtitle}</p></div><div class="category">${p.category||''}</div></div><div class="main-grid"><div class="story"><div class="role" data-edit><b>담당 / 범위</b>${p.role}</div><div class="story-block"><h3>PAIN POINT</h3>${storyList(p.pain)}</div><div class="story-block solution"><h3>SOLUTION</h3>${storyList(p.solution)}</div><div class="takeaway" data-edit>${p.takeaway}</div>${tags(p.tags)}</div><figure class="visual" style="margin:0"><div class="visual-stage ${p.stage||''}">${p.visual}</div><figcaption class="caption">${p.caption}</figcaption></figure></div>${features(p.features)}<a class="project-url" contenteditable="false" href="${link.url}" target="_blank" rel="noopener noreferrer">${decodeURIComponent(link.url.replace('https://',''))} ↗</a>`});evidence.push({title:p.name,note:p.note||p.caption,files:p.files});}
 slides.push(coverSlide());
 const helpers={project,img,badge,stats,table,flow,app,bar};
 aiProjects(helpers);webtoonProject(helpers);productProjects(helpers);
 slides.push({name:'제가 가져갈 설계 기준',class:'dark',html:`<div class="heading"><div><p class="eyebrow">DESIGN PRINCIPLES</p><h2 style="font-size:51px;line-height:1.25" data-edit>좋은 답변이,<br>다음 업무에서도 쓰일 수 있도록.</h2><p class="sub" style="margin-top:18px" data-edit>프로젝트를 통해 쌓은 네 가지 설계 기준입니다.</p></div></div><div class="closing-grid"><article><h3 data-edit>정확도 / 근거부터 확인합니다.</h3><p data-edit>검색이 찾은 정보와 모델이 만든 답을 구분하고,<br>데이터와 계산을 다시 확인할 수 있게 남깁니다.</p></article><article><h3 data-edit>일관성 / 출력의 약속을 만듭니다.</h3><p data-edit>필수 필드·자료형·판단 기준을 명시하고,<br>계산과 설명의 역할을 나눕니다.</p></article><article><h3 data-edit>속도 / 기다리는 구간을 나눕니다.</h3><p data-edit>병렬 생성·스트리밍·비동기 처리를 선택하고,<br>요청에서 표시까지의 지연을 측정합니다.</p></article><article><h3 data-edit>비용 / 필요한 문맥만 전달합니다.</h3><p data-edit>토큰과 호출을 기록하고, 역할별 데이터와<br>출력 범위를 줄일 수 있는 지점을 찾습니다.</p></article></div><div class="closing-author" data-edit>이 기준으로, 다음 AI 서비스를 설계하겠습니다.</div>`});
 slides.push({name:'GitHub · 전체 프로젝트 디렉토리',class:'github-slide',html:`<div class="github-directory"><p class="directory-label">GITHUB</p><h2 data-edit>프로젝트 전체 디렉토리</h2><a class="directory-link" contenteditable="false" href="${portfolioRepository}" target="_blank" rel="noopener noreferrer"><span>github.com/KR-Nom/</span><strong>my-new-project-portfolio <i>↗</i></strong></a><p class="directory-note" data-edit>각 프로젝트의 코드와 실행·설계 자료를 확인할 수 있습니다.</p></div>`});
 return {slides,evidence};
}
