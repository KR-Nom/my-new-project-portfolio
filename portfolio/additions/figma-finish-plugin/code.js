/* Native Figma Slides Plugin API. No MCP, network, external assets, or HTML changes. */
(async () => {
  const PROJECT_KEY = 'hyeonjin-portfolio-project';
  const BUILD_KEY = 'hyeonjin-portfolio-build';
  const EXPECTED_FILE = 'BtEeOASUuWzEkWpycXmhEb';
  const BASE_IDS = ['4:2', '10:7', '10:34', '4:30', '4:53', '4:75', '4:98', '4:121', '4:143'];
  const CLOSING_ID = '4:166';
  const GOLABA_ID = '22:12';
  const DRIVING_ID = '21:2';
  const ABOUT_FRAME_NAME = 'Profile / Confirmed experience education awards';
  const getGrid = () => typeof figma.getCanvasGrid === 'function' ? figma.getCanvasGrid() : figma.getSlideGrid();
  const setGrid = grid => typeof figma.setCanvasGrid === 'function' ? figma.setCanvasGrid(grid) : figma.setSlideGrid(grid);
  const allText = parent => parent.findAllWithCriteria({ types: ['TEXT'] });
  const fontKey = font => JSON.stringify(font);
  const loadedFonts = new Set();

  async function loadFonts(fonts) {
    const unique = new Map(fonts.map(font => [fontKey(font), font]));
    for (const [key, font] of unique) {
      if (!loadedFonts.has(key)) {
        await figma.loadFontAsync(font);
        loadedFonts.add(key);
      }
    }
  }

  async function loadTextFonts(nodes) {
    const fonts = [];
    for (const node of nodes) {
      if (node.characters.length) fonts.push(...node.getRangeAllFontNames(0, node.characters.length));
      else if (node.fontName !== figma.mixed) fonts.push(node.fontName);
    }
    await loadFonts(fonts);
  }

  function contentParts(row) {
    const textNodes = allText(row);
    return {
      number: textNodes.find(node => /^Contents \/ Number \d+$/.test(node.name)),
      title: textNodes.find(node => /^Contents \/ Name \d+$/.test(node.name)),
      description: textNodes.find(node => /^Contents \/ Description \d+$/.test(node.name))
    };
  }

  function requireParts(row) {
    const parts = contentParts(row);
    if (!parts.number || !parts.title || !parts.description) throw new Error('목차 행 구조가 달라졌습니다: ' + row.name);
    if (!parts.title.parent || parts.title.parent.type !== 'FRAME') throw new Error('목차 제목 프레임을 찾지 못했습니다.');
    return parts;
  }

  function setProjectNumber(slideNode, value) {
    const node = allText(slideNode).find(textNode => textNode.name === 'Project number');
    if (!node) throw new Error('프로젝트 번호 레이어를 찾지 못했습니다: ' + slideNode.id);
    node.characters = value;
  }

  function findHonbot(slides) {
    const matches = slides.filter(slideNode => slideNode.getPluginData(PROJECT_KEY) === 'honbot' ||
      allText(slideNode).some(node => node.name === 'Project name' && node.characters.trim() === 'HONBOT'));
    if (matches.length > 1) throw new Error('HONBOT 슬라이드가 여러 장입니다. 중복 여부를 먼저 확인해 주세요.');
    return matches[0] || null;
  }

  function findAboutFrame(slideNode) {
    const matches = slideNode.children.filter(node => node.type === 'FRAME' && node.name === ABOUT_FRAME_NAME);
    if (matches.length > 1) throw new Error('새 프로필 프레임이 여러 개입니다. 중복 여부를 먼저 확인해 주세요.');
    const frame = matches[0] || null;
    if (frame && frame.getPluginData(BUILD_KEY) !== 'complete') throw new Error('이전 프로필 생성이 완료되지 않았습니다. 이전 실행을 실행 취소한 뒤 다시 실행해 주세요.');
    return frame;
  }

  async function updateAbout(slideNode, existingFrame) {
    if (existingFrame) return existingFrame;
    const oldChildren = [...slideNode.children];
    const newFrame = await buildAboutContent(slideNode);
    for (const child of oldChildren) {
      if (child === newFrame) continue;
      if (!child.getPluginData('profile-original-visibility')) {
        child.setPluginData('profile-original-visibility', child.visible === false ? 'hidden' : 'visible');
      }
      child.visible = false;
    }
    newFrame.visible = true;
    return newFrame;
  }

  function drivingParts(slideNode) {
    const texts = allText(slideNode);
    const title = texts.find(node => node.name === 'Project name');
    const definition = texts.find(node => node.name === 'One line definition');
    const caption = texts.find(node => node.name === 'Screen caption');
    const app = slideNode.findOne(node => node.type === 'FRAME' && node.name === 'DriveLab / 경험 기반 화면 재구성');
    const stages = app && app.findOne(node => node.type === 'FRAME' && node.name === 'Hardware to learning loop');
    if (!title || !definition || !caption || !app || !stages || stages.children.length !== 4) {
      throw new Error('자율주행 슬라이드 구조가 달라졌습니다. 기존 내용을 보존하고 중단합니다.');
    }
    const groups = stages.children.map(group => {
      const nodes = allText(group);
      const heading = nodes.find(node => node.name.endsWith(' title'));
      const detail = nodes.find(node => node.name.endsWith(' detail'));
      if (group.type !== 'FRAME' || !heading || !detail) throw new Error('자율주행 제어 흐름 레이어를 찾지 못했습니다.');
      return { group, heading, detail };
    });
    return { title, definition, caption, app, stages, groups };
  }

  function updateDriving(slideNode, parts) {
    // Mirrors driving-slide.js; the reference architecture is labelled separately.
    parts.title.characters = 'RC카 자율주행';
    parts.definition.characters = '직접 조립한 RC카에, 수집한 주행 데이터를 학습시키다.';
    parts.caption.characters = '수집 화면은 경험 기반 재구성 · 하단 제어 흐름은 Hustar-HAI 참고';
    parts.caption.fontSize = 16;
    parts.caption.resize(1160, 1);
    parts.caption.textAutoResize = 'HEIGHT';
    parts.caption.x = 64;
    parts.caption.y = 865;
    parts.stages.resize(1080, 88);
    parts.stages.x = 24;
    parts.stages.y = 510;
    parts.stages.itemSpacing = 20;
    const entries = [
      ['카메라·전처리', '주행 영상에서 입력 구성'],
      ['CNN 방향 예측', '좌회전 · 직진 · 우회전'],
      ['TCP 명령 전송', '판단 결과를 제어부로 전달'],
      ['제어보드·모터', '구동 방향과 PWM 제어']
    ];
    parts.groups.forEach(({ group, heading, detail }, index) => {
      const [name, body] = entries[index];
      group.name = name;
      group.itemSpacing = 7;
      heading.name = name + ' title';
      heading.characters = name;
      heading.fontSize = 18;
      heading.resize(255, 1);
      heading.textAutoResize = 'HEIGHT';
      detail.name = name + ' detail';
      detail.characters = body;
      detail.fontSize = 15;
      detail.resize(255, 1);
      detail.textAutoResize = 'HEIGHT';
    });
    let reference = parts.app.findOne(node => node.type === 'TEXT' && node.name === 'Reference architecture label');
    if (!reference) {
      reference = figma.createText();
      parts.app.appendChild(reference);
      reference.name = 'Reference architecture label';
    }
    reference.fontName = { family: 'Noto Sans KR', style: 'Medium' };
    reference.fontSize = 13;
    reference.lineHeight = { unit: 'PERCENT', value: 145 };
    reference.characters = '참고 구조 · Hustar-HAI';
    reference.fills = [{ type: 'SOLID', color: { r: 162 / 255, g: 118 / 255, b: 85 / 255 } }];
    reference.resize(1080, 1);
    reference.textAutoResize = 'HEIGHT';
    reference.x = 24;
    reference.y = 481;
    reference.hyperlink = { type: 'URL', value: 'https://github.com/wotjd0715/Hustar-HAI' };
    addDrivingHardware(slideNode);
  }

  function addDrivingHardware(s) {
if (s.findOne(n=>n.name==='RC car / 제작 경험 구성도' && n.type==='FRAME')) return;
const created=[];
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
function box(parent,name,x,y,w,h,color,radius=0){const n=figma.createRectangle();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=[{type:'SOLID',color:rgb(color)}];n.cornerRadius=radius;n.x=x;n.y=y;created.push(n.id);return n;}
function frame(parent,name,x,y,w,h,color,radius=0){const n=figma.createFrame();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=color?[{type:'SOLID',color:rgb(color)}]:[];n.cornerRadius=radius;n.clipsContent=true;n.x=x;n.y=y;created.push(n.id);return n;}
function text(parent,name,value,size,color,w,weight='Regular',family='Noto Sans KR'){const n=figma.createText();parent.appendChild(n);n.name=name;n.fontName={family,style:weight};n.fontSize=size;n.lineHeight={unit:'PERCENT',value:145};n.characters=value;n.fills=[{type:'SOLID',color:rgb(color)}];n.resize(w,1);n.textAutoResize='HEIGHT';created.push(n.id);return n;}
function label(parent,name,value,size,color,x,y,w,weight='Regular',family='Noto Sans KR'){const n=text(parent,name,value,size,color,w,weight,family);n.x=x;n.y=y;return n;}
const hardware=frame(s,'RC car / 제작 경험 구성도',1260,708,592,158,'#EDEAE3',12);
box(hardware,'Left front wheel',22,24,24,42,'#39403E',6);box(hardware,'Right front wheel',163,24,24,42,'#39403E',6);
box(hardware,'Left rear wheel',22,94,24,42,'#39403E',6);box(hardware,'Right rear wheel',163,94,24,42,'#39403E',6);
box(hardware,'3D printed chassis',40,21,129,118,'#D49860',18);
box(hardware,'Control board',71,61,68,46,'#738E7C',5);
box(hardware,'Camera position',85,30,40,20,'#455452',5);
label(hardware,'Hardware title','3D 프린팅 차체',21,'#364139',223,26,345,'Bold');
label(hardware,'Hardware details','구입한 바퀴·구동 부품 조립\n조이스틱으로 직접 주행',18,'#6D7770',223,65,345);
label(hardware,'Hardware caption','제작 경험을 설명한 구성도',13,'#8C938D',223,124,345);

}

  async function buildAboutContent(existingSlide) {
const created=[],mutated=[],built=[],screens=[];
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
await Promise.all(['Regular','Medium','Bold'].map(style=>figma.loadFontAsync({family:'Noto Sans KR',style})).concat(['Regular','Bold','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style}))));
function box(parent,name,x,y,w,h,color,radius=0){const n=figma.createRectangle();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=[{type:'SOLID',color:rgb(color)}];n.cornerRadius=radius;n.x=x;n.y=y;created.push(n.id);return n;}
function frame(parent,name,x,y,w,h,color,radius=0){const n=figma.createFrame();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=color?[{type:'SOLID',color:rgb(color)}]:[];n.cornerRadius=radius;n.clipsContent=true;n.x=x;n.y=y;created.push(n.id);return n;}
function col(parent,name,x,y,w,gap=12){const n=figma.createFrame();n.layoutMode='VERTICAL';n.primaryAxisSizingMode='AUTO';parent.appendChild(n);n.name=name;n.resize(w,1);n.primaryAxisSizingMode='AUTO';n.clipsContent=false;n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.fills=[];n.x=x;n.y=y;created.push(n.id);return n;}
function row(parent,name,x,y,w,h,gap=16){const n=figma.createFrame();n.layoutMode='HORIZONTAL';parent.appendChild(n);n.name=name;n.resize(w,h);n.counterAxisSizingMode='FIXED';n.primaryAxisSizingMode='FIXED';n.itemSpacing=gap;n.fills=[];n.x=x;n.y=y;created.push(n.id);return n;}
function text(parent,name,value,size,color,w,weight='Regular',family='Noto Sans KR'){const n=figma.createText();parent.appendChild(n);n.name=name;n.fontName={family,style:weight};n.fontSize=size;n.lineHeight={unit:'PERCENT',value:145};n.characters=value;n.fills=[{type:'SOLID',color:rgb(color)}];n.resize(w,1);n.textAutoResize='HEIGHT';created.push(n.id);return n;}
function label(parent,name,value,size,color,x,y,w,weight='Regular',family='Noto Sans KR'){const n=text(parent,name,value,size,color,w,weight,family);n.x=x;n.y=y;return n;}
function ellipse(parent,name,x,y,w,h,color){const n=figma.createEllipse();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=[{type:'SOLID',color:rgb(color)}];n.x=x;n.y=y;created.push(n.id);return n;}
function vector(parent,name,data,x,y,color,stroke=null,sw=1){const n=figma.createVector();parent.appendChild(n);n.name=name;n.vectorPaths=[{windingRule:'NONZERO',data}];n.fills=color?[{type:'SOLID',color:rgb(color)}]:[];n.strokes=stroke?[{type:'SOLID',color:rgb(stroke)}]:[];n.strokeWeight=sw;n.x=x;n.y=y;created.push(n.id);return n;}
function section(parent,title,body,w,accent,ink,size=24){const c=col(parent,title,0,0,w,9);text(c,title+' label',title,15,accent,w,'Bold','Inter');text(c,title+' body',body,size,ink,w);return c;}
function slide(name,bg){const s=figma.createFrame();existingSlide.appendChild(s);s.name=ABOUT_FRAME_NAME;s.resize(1920,1080);s.x=0;s.y=0;s.visible=false;s.clipsContent=true;s.setPluginData(BUILD_KEY,'building');s.fills=[{type:'SOLID',color:rgb(bg)}];created.push(s.id);built.push(s);box(s,'SK signature',0,0,11,1080,'#EA002C');return s;}
function footer(s,url,dark=false){const n=label(s,'GitHub URL',url,17,dark?'#B8C1C8':'#656B73',64,1020,1792,'Regular','Inter');n.hyperlink={type:'URL',value:url};return n;}
function check(){const issues=[];for(const s of built){for(const n of s.children){if(n.x<0||n.y<0||n.x+n.width>1921||n.y+n.height>1081)issues.push({slide:s.id,node:n.id,name:n.name,bounds:[n.x,n.y,n.width,n.height]});}for(const f of s.findAllWithCriteria({types:['FRAME']})){if(!f.clipsContent)continue;const b=f.absoluteBoundingBox;for(const t of f.findAllWithCriteria({types:['TEXT']})){const a=t.absoluteBoundingBox;if(a&&b&&(a.x<b.x-1||a.y<b.y-1||a.x+a.width>b.x+b.width+1||a.y+a.height>b.y+b.height+1))issues.push({slide:s.id,type:'textClip',node:t.id,parent:f.id});}}}return issues;}

const s=slide('02 About me','#F6F6F3'),ink='#25282D',muted='#616770',red='#EA002C',orange='#E86A17',rule='#D9DCDD';
// Latest user-provided entries are maintained separately in about-data.json.
// This source builds editable native text and Auto Layout containers for one slide.
label(s,'About / Eyebrow','ABOUT ME',17,orange,64,34,360,'Bold','Inter');
label(s,'About / Name','장현진',57,ink,64,63,330,'Bold');
label(s,'About / Degree','전남대학교 전기및반도체공학 학사 · 2018.03–2026.02',23,muted,452,86,1340);
label(s,'About / Page purpose','경험 · 교육 · 수상',23,muted,64,158,1200);
box(s,'About / Header divider',64,208,1792,1,rule);
box(s,'About / Column divider 1',642,258,1,728,rule);
box(s,'About / Column divider 2',1258,258,1,728,rule);

function aboutText(parent,name,value,size,color,w,weight='Regular',family='Noto Sans KR',lineHeight=140){
  const node=text(parent,name,value,size,color,w,weight,family);
  node.lineHeight={unit:'PERCENT',value:lineHeight};
  return node;
}
function aboutColumn(name,x,w,accent,gap){
  const parent=col(s,'About / '+name,x,245,w,27);
  aboutText(parent,name+' / Heading',name,27,accent,w,'Bold','Inter',135);
  const list=col(parent,name+' / Entries',0,0,w,gap);
  return list;
}
function experienceItem(parent,index,date,title,role,summary){
  const item=col(parent,'Experience / Entry '+index,0,0,546,8);
  aboutText(item,'Experience / Date '+index,date,17,orange,546,'Regular','Inter',135);
  aboutText(item,'Experience / Title '+index,title,25,ink,546,'Bold',undefined,140);
  aboutText(item,'Experience / Role '+index,role,20,ink,546,'Medium',undefined,140);
  aboutText(item,'Experience / Summary '+index,summary,20,muted,546,'Regular',undefined,150);
}
function educationItem(parent,index,date,title,role,summary){
  const item=col(parent,'Education / Entry '+index,0,0,546,6);
  aboutText(item,'Education / Date '+index,date,17,red,546,'Regular','Inter',135);
  aboutText(item,'Education / Title '+index,title,24,ink,546,'Bold',undefined,140);
  aboutText(item,'Education / Course '+index,role,20,ink,546,'Medium',undefined,140);
  aboutText(item,'Education / Summary '+index,summary,19,muted,546,'Regular',undefined,145);
}
function awardItem(parent,index,date,title,issuer,summary){
  const item=col(parent,'Awards / Entry '+index,0,0,560,7);
  aboutText(item,'Awards / Title '+index,title,23,ink,560,'Bold',undefined,140);
  aboutText(item,'Awards / Date and issuer '+index,date+' · '+issuer,17,red,560,'Regular',undefined,140);
  aboutText(item,'Awards / Summary '+index,summary,19,muted,560,'Regular',undefined,145);
}

const experience=aboutColumn('EXPERIENCE',64,546,orange,36);
experienceItem(experience,1,'2026.02–2026.05','대신기공 · 폴란드 Płock 플랜트','QC 인턴','Hydro Test 문서·검사 데이터 관리\nPICS·WIR·MTC·ISO 대조 및 Sheets 자동화');
experienceItem(experience,2,'2022.03–2025.06','전남대학교 R.O.B LAB','학부연구생 및 실험실장','RNN·LSTM 시계열 예측, 전처리·정규화 비교\n6개월 실험실장: 세미나·발표·협업 운영');
experienceItem(experience,3,'2023.10–2023.11','ICT이노베이션스퀘어\n우수교육생 국외연수','미국 뉴욕','글로벌 ICT 기업·스타트업 실무 공유\nLinkedIn 재직자 세션 · IBM 로봇개·코드 교육');

const education=aboutColumn('EDUCATION',680,546,red,25);
educationItem(education,1,'2026.07–현재','SKALA 4기 · SK AX','생성형 AI 서비스 개발 과정','Java·Spring·DB · Python·ML/DL · LLM/RAG\nAI 에이전트·서빙·AIOps · Docker·K8s·MSA');
educationItem(education,2,'2024.07–2024.08','수도권 ICT이노베이션스퀘어','Deep Dive Fullstack + GenAI Course','웹 개발·크롤링·OpenAI API·n8n 자동화\nAWS·Docker·Git·Linux 개발·배포 환경');
educationItem(education,3,'2024.03–2024.05','패스트캠퍼스','나도 할 수 있는 Java&Spring\n웹 개발 종합반','Java·Spring 서버·웹 애플리케이션 구현 기초');
educationItem(education,4,'2023.06–2023.07','호남 ICT이노베이션스퀘어','AI융합 개발과정 전남대 특별반','전처리·회귀·앙상블·군집화·PCA · CNN·RNN');

const awards=aboutColumn('AWARDS',1296,560,orange,27);
awardItem(awards,1,'2025.01','전남대학교 자유학기 성과발표회 대상','전남대학교 총장상','온도 감지 충전 · Arduino·NFC·UART');
awardItem(awards,2,'2024.12','일취월장 프로그램 우수상','전남대학교 글로벌교육원장상','여수캠퍼스 2024학년도 2학기 학습법 우수 활동');
awardItem(awards,3,'2024.09','대학생 무한도전 프로젝트 장려상','전남인재평생교육진흥원','LinkLike SNS형 플랫폼 · 팀장·기획·개발');
awardItem(awards,4,'2024.08','수도권 ICT이노베이션스퀘어\nDeep Dive 프로젝트 우수상','수도권 ICT이노베이션스퀘어','시각장애인 AI 웹툰 안내 · 텍스트 추출·TTS');
awardItem(awards,5,'2023.07','전남권 사회문제해결\n아이디어 공모전 대상','호남 ICT이노베이션스퀘어','폐교·유휴공간 스마트팜 · Python·회귀·PyQt5');

s.setPluginData(BUILD_KEY,'complete');return s;
}

  // This builder is replaced with the prepared native HONBOT slide before delivery.
  async function buildHonbotSlide() {
const created=[],mutated=[],built=[],screens=[];
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
await Promise.all(['Regular','Medium','Bold'].map(style=>figma.loadFontAsync({family:'Noto Sans KR',style})).concat(['Regular','Bold','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style}))));
function box(parent,name,x,y,w,h,color,radius=0){const n=figma.createRectangle();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=[{type:'SOLID',color:rgb(color)}];n.cornerRadius=radius;n.x=x;n.y=y;created.push(n.id);return n;}
function frame(parent,name,x,y,w,h,color,radius=0){const n=figma.createFrame();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=color?[{type:'SOLID',color:rgb(color)}]:[];n.cornerRadius=radius;n.clipsContent=true;n.x=x;n.y=y;created.push(n.id);return n;}
function col(parent,name,x,y,w,gap=12){const n=figma.createFrame();n.layoutMode='VERTICAL';n.primaryAxisSizingMode='AUTO';parent.appendChild(n);n.name=name;n.resize(w,1);n.primaryAxisSizingMode='AUTO';n.clipsContent=false;n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.fills=[];n.x=x;n.y=y;created.push(n.id);return n;}
function row(parent,name,x,y,w,h,gap=16){const n=figma.createFrame();n.layoutMode='HORIZONTAL';parent.appendChild(n);n.name=name;n.resize(w,h);n.counterAxisSizingMode='FIXED';n.primaryAxisSizingMode='FIXED';n.itemSpacing=gap;n.fills=[];n.x=x;n.y=y;created.push(n.id);return n;}
function text(parent,name,value,size,color,w,weight='Regular',family='Noto Sans KR'){const n=figma.createText();parent.appendChild(n);n.name=name;n.fontName={family,style:weight};n.fontSize=size;n.lineHeight={unit:'PERCENT',value:145};n.characters=value;n.fills=[{type:'SOLID',color:rgb(color)}];n.resize(w,1);n.textAutoResize='HEIGHT';created.push(n.id);return n;}
function label(parent,name,value,size,color,x,y,w,weight='Regular',family='Noto Sans KR'){const n=text(parent,name,value,size,color,w,weight,family);n.x=x;n.y=y;return n;}
function ellipse(parent,name,x,y,w,h,color){const n=figma.createEllipse();parent.appendChild(n);n.name=name;n.resize(w,h);n.fills=[{type:'SOLID',color:rgb(color)}];n.x=x;n.y=y;created.push(n.id);return n;}
function vector(parent,name,data,x,y,color,stroke=null,sw=1){const n=figma.createVector();parent.appendChild(n);n.name=name;n.vectorPaths=[{windingRule:'NONZERO',data}];n.fills=color?[{type:'SOLID',color:rgb(color)}]:[];n.strokes=stroke?[{type:'SOLID',color:rgb(stroke)}]:[];n.strokeWeight=sw;n.x=x;n.y=y;created.push(n.id);return n;}
function section(parent,title,body,w,accent,ink,size=24){const c=col(parent,title,0,0,w,9);text(c,title+' label',title,15,accent,w,'Bold','Inter');text(c,title+' body',body,size,ink,w);return c;}
function slide(name,bg){const s=figma.createSlide();s.setPluginData(PROJECT_KEY,'honbot');s.setPluginData(BUILD_KEY,'building');s.name=name;s.fills=[{type:'SOLID',color:rgb(bg)}];created.push(s.id);built.push(s);box(s,'SK signature',0,0,11,1080,'#EA002C');return s;}
function footer(s,url,dark=false){const n=label(s,'GitHub URL',url,17,dark?'#B8C1C8':'#656B73',64,1020,1792,'Regular','Inter');n.hyperlink={type:'URL',value:url};return n;}
function check(){const issues=[];for(const s of built){for(const n of s.children){if(n.x<0||n.y<0||n.x+n.width>1921||n.y+n.height>1081)issues.push({slide:s.id,node:n.id,name:n.name,bounds:[n.x,n.y,n.width,n.height]});}for(const f of s.findAllWithCriteria({types:['FRAME']})){if(!f.clipsContent)continue;const b=f.absoluteBoundingBox;for(const t of f.findAllWithCriteria({types:['TEXT']})){const a=t.absoluteBoundingBox;if(a&&b&&(a.x<b.x-1||a.y<b.y-1||a.x+a.width>b.x+b.width+1||a.y+a.height>b.y+b.height+1))issues.push({slide:s.id,type:'textClip',node:t.id,parent:f.id});}}}return issues;}

const s=slide('08 HONBOT','#151D29'),accent='#A6BAFF',ink='#F4F6FA';
const intro=col(s,'Project overview',64,48,605,9);
text(intro,'Project number','08',64,accent,605,'Bold','Inter');
text(intro,'Project name','HONBOT',60,ink,605,'Bold','Inter');
text(intro,'One line definition','영상과 대화가 한 화면에서\n이어지는 AI 챗봇.',28,ink,605,'Medium');
const body=col(s,'Project details',64,335,605,25);
section(body,'PAIN POINT','1. 영상과 질문·답변의 맥락이 분리됨\n2. API 응답 대기와 오류 상태를 알기 어려움',605,accent,ink,24);
section(body,'SOLUTION · 화면 발전','1. 영상·대화 기록·입력창을 한곳에 구성\n2. 질문 → 대기 → 응답 상태를 명확히 표현\n3. 이전 대화를 보며 후속 질문을 이어감',605,accent,ink,24);
section(body,'ROLE','ChatGPT API 연동 학습 · 요청·응답 흐름 이해\n이번 발전: 영상 대화 UI와 상태 흐름 설계',605,accent,ink,21);
section(body,'TECH STACK','ChatGPT API · Figma\n영상 챗봇 경험 · 대화 인터페이스 설계',605,accent,'#A7B3C5',20);
const app=frame(s,'HONBOT / 대화 경험 발전 시안',736,184,1120,664,'#F6F8FC',16);
box(app,'App topbar',0,0,1120,70,'#FFFFFF');
ellipse(app,'Brand circle',24,22,26,26,'#6D86DC');
label(app,'Brand initial','h',18,'#FFFFFF',31,20,25,'Bold','Inter');
label(app,'Brand','HONBOT',24,'#273349',61,17,300,'Bold','Inter');
label(app,'Session label','영상 대화',17,'#8891A4',213,23,270);
box(app,'Conversation chip',905,18,190,35,'#EDF1FF',18);
label(app,'Conversation chip label','새로운 이야기 시작',14,'#6679B7',927,26,160,'Medium');
const video=frame(app,'Video / AI 대화 영역',24,93,575,438,'#DCE4F7',12);
ellipse(video,'Video soft glow',38,5,492,432,'#D4DFF4');
ellipse(video,'Avatar outer halo',129,62,308,290,'#E8EEFB');
box(video,'Avatar body',153,204,262,145,'#7F97DA',66);
box(video,'Avatar face',167,105,234,175,'#F5F7FD',72);
ellipse(video,'Avatar left eye',226,169,15,20,'#5668A2');
ellipse(video,'Avatar right eye',328,169,15,20,'#5668A2');
box(video,'Avatar smile',266,213,38,7,'#8596C9',3);
box(video,'Video label chip',17,17,132,29,'#F5F7FD',14);
label(video,'Video label','HONBOT',13,'#7A8EBD',39,22,110,'Bold','Inter');
box(video,'Subtitle surface',23,364,529,52,'#FAFBFE',10);
label(video,'Video subtitle','“좋아요. 차근차근 이야기해 볼까요?”',19,'#4D607F',45,376,490,'Medium');
const chat=frame(app,'Chat history',620,93,476,438,'#FFFFFF',12);
label(chat,'Chat heading','지금 나눈 이야기',21,'#2B3B55',22,17,400,'Bold');
label(chat,'Chat heading note','예시 대화',13,'#9AA4B5',362,25,100);
box(chat,'User bubble',66,75,385,74,'#EAF0FF',12);
label(chat,'User bubble text','오늘 배운 내용을 함께\n정리해 보고 싶어요.',19,'#435985',84,87,346);
box(chat,'Assistant bubble',22,169,398,116,'#F5F7FB',12);
label(chat,'Assistant bubble text','좋아요. 가장 기억에 남는 내용을\n한 가지 들려주세요.\n그 이야기부터 정리해 볼게요.',18,'#5D6C84',40,183,366);
label(chat,'Follow-up label','이어서 이야기하기',14,'#9DA6B8',23,310,400);
box(chat,'Prompt chip',22,342,245,39,'#EEF2FB',20);
label(chat,'Prompt chip text','핵심 내용을 요약하고 싶어요',14,'#7486AD',37,351,228);
const state=row(app,'Request state progression',27,552,1058,35,22);
for(const [name,value,w] of [['입력','01  질문 입력',185],['대기','02  응답 기다리는 중',275],['표시','03  답변 표시',200]])text(state,'Request state / '+name,value,15,'#8D9AB2',w,'Medium');
box(app,'Input box',24,597,977,44,'#FFFFFF',9);
label(app,'Input placeholder','이야기를 입력하세요…',16,'#A7B0C0',44,607,900);
box(app,'Send button',1013,597,83,44,'#6984DC',9);
label(app,'Send label','보내기',16,'#FFFFFF',1031,607,67,'Bold');
label(s,'Screen caption','영상 챗봇 경험을 바탕으로 발전시킨 UI · 영상·대화 내용은 설명용 시안',17,'#A7B3C5',736,873,1120);
label(s,'Design focus','대화의 맥락과 응답 상태가 한눈에 보이도록',24,'#D1DAED',736,938,1120,'Medium');
footer(s,'https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/honbot',true);
s.setPluginData(BUILD_KEY,'complete');return s;
}

  try {
    if (figma.editorType !== 'slides') throw new Error('장현진 포트폴리오 Figma Slides 파일에서 실행해 주세요.');
    if (figma.fileKey && figma.fileKey !== EXPECTED_FILE) throw new Error('이 플러그인은 장현진 포트폴리오 편집본 전용입니다.');
    const initialGrid = getGrid();
    const initialNodes = initialGrid.flat();
    const slides = initialNodes.filter(node => node.type === 'SLIDE');
    const byId = new Map(slides.map(node => [node.id, node]));
    const requiredIds = [...BASE_IDS, GOLABA_ID, DRIVING_ID, CLOSING_ID];
    if (requiredIds.some(id => !byId.has(id))) throw new Error('기존 12장 중 필요한 슬라이드를 찾지 못했습니다. 원래 편집본에서 실행해 주세요.');

    const cover = byId.get(BASE_IDS[0]);
    const closing = byId.get(CLOSING_ID);
    if (!allText(cover).some(node => node.characters.includes('장현진')) ||
      !allText(closing).some(node => node.characters.includes('my-new-project-portfolio'))) {
      throw new Error('파일 내용이 예상한 포트폴리오와 다릅니다. 변경하지 않았습니다.');
    }

    const contents = byId.get('10:34');
    const about = byId.get('10:7');
    const existingAboutFrame = findAboutFrame(about);
    const toonvoice = byId.get('4:75');
    const toonRoles = allText(toonvoice).filter(node => node.name === 'ROLE body');
    if (toonRoles.length !== 1) throw new Error('ToonVoice ROLE 본문 레이어를 정확히 찾지 못했습니다.');
    const toonRole = toonRoles[0];
    const list = contents.findOne(node => node.type === 'FRAME' &&
      ['Contents / Six projects', 'Contents / Nine projects'].includes(node.name));
    if (!list) throw new Error('기존 프로젝트 목차 목록을 찾지 못했습니다.');
    const rows = [];
    for (let index = 1; index <= 9; index++) {
      const matches = list.children.filter(node => node.type === 'FRAME' && node.name === 'Contents / Row ' + index);
      if (matches.length > 1 || (index <= 6 && matches.length !== 1)) throw new Error('목차 행 ' + index + '의 구조가 달라졌습니다.');
      if (matches[0]) {
        requireParts(matches[0]);
        rows[index - 1] = matches[0];
      }
    }
    const dividerTemplate = contents.findOne(node => node.name === 'Contents / Divider 5' && node.type === 'RECTANGLE');
    if (!dividerTemplate) throw new Error('기존 목차 구분선을 찾지 못했습니다.');

    const golaba = byId.get(GOLABA_ID);
    const driving = byId.get(DRIVING_ID);
    const drivingNodes = drivingParts(driving);
    for (const node of [golaba, driving]) {
      if (!allText(node).some(textNode => textNode.name === 'Project number')) throw new Error('추가 프로젝트의 번호 레이어가 없습니다.');
    }
    let honbot = findHonbot(slides);
    if (honbot && honbot.getPluginData(BUILD_KEY) === 'building') {
      throw new Error('이전 HONBOT 생성이 완료되지 않았습니다. 이전 실행을 실행 취소한 뒤 다시 실행해 주세요.');
    }
    if (honbot && !allText(honbot).some(node => node.name === 'Project number')) throw new Error('기존 HONBOT 번호 레이어가 없습니다.');

    // All required fonts and existing structures are checked before the first edit.
    await loadTextFonts([...allText(contents), ...allText(golaba), ...allText(driving), toonRole, ...(honbot ? allText(honbot) : [])]);
    await loadFonts([
      ...['Regular', 'Medium', 'Bold'].map(style => ({ family: 'Noto Sans KR', style })),
      ...['Regular', 'Medium', 'Bold', 'Semi Bold'].map(style => ({ family: 'Inter', style }))
    ]);
    if (!honbot) honbot = await buildHonbotSlide();
    await updateAbout(about, existingAboutFrame);
    toonRole.characters = '2024 Deep Dive · 웹툰 OCR·TTS 프로젝트\n이번 확장: 웹·DB·실제 음성 검증';

    const additions = [
      { name: 'GOLABA', description: '신청 접수와 AI 서류 검토를 분리하는 지원사업 플랫폼' },
      { name: 'HONBOT', description: '시청한 영상의 맥락을 이어 가는 대화형 챗봇' },
      { name: 'RC카 자율주행', description: '직접 제작한 차체와 주행 데이터로 학습하는 자율주행' }
    ];
    for (let index = 6; index < 9; index++) {
      if (!rows[index]) {
        const row = rows[5].clone();
        list.appendChild(row);
        row.name = 'Contents / Row ' + (index + 1);
        row.setPluginData(PROJECT_KEY, ['golaba', 'honbot', 'driving'][index - 6]);
        rows[index] = row;
      }
      const parts = requireParts(rows[index]);
      parts.number.name = 'Contents / Number ' + index;
      parts.title.name = 'Contents / Name ' + index;
      parts.description.name = 'Contents / Description ' + index;
      parts.title.parent.name = 'Contents / Text ' + index;
      parts.number.characters = 'Project ' + String(index + 1).padStart(2, '0');
      parts.title.characters = additions[index - 6].name;
      parts.description.characters = additions[index - 6].description;
      // The original row template uses Inter for Latin project names.
      if (index === 8) parts.title.fontName = { family: 'Noto Sans KR', style: 'Bold' };
    }

    const TOP = 237;
    const HEIGHT = 86;
    list.name = 'Contents / Nine projects';
    list.layoutMode = 'VERTICAL';
    list.primaryAxisSizingMode = 'AUTO';
    list.counterAxisSizingMode = 'FIXED';
    list.itemSpacing = 0;
    list.paddingTop = 0;
    list.paddingBottom = 0;
    list.paddingLeft = 0;
    list.paddingRight = 0;
    list.clipsContent = false;
    list.resize(1720, HEIGHT * 9);
    list.x = 100;
    list.y = TOP;
    for (let index = 0; index < 9; index++) {
      const row = rows[index];
      list.insertChild(index, row);
      row.layoutMode = 'HORIZONTAL';
      row.primaryAxisSizingMode = 'FIXED';
      row.counterAxisSizingMode = 'FIXED';
      row.counterAxisAlignItems = 'CENTER';
      row.itemSpacing = 20;
      row.clipsContent = false;
      row.resize(1720, HEIGHT);
      const parts = requireParts(row);
      parts.number.fontSize = 22;
      parts.number.resize(190, 1);
      parts.number.textAutoResize = 'HEIGHT';
      parts.title.fontSize = 30;
      parts.title.lineHeight = { unit: 'PERCENT', value: 125 };
      parts.title.resize(1510, 1);
      parts.title.textAutoResize = 'HEIGHT';
      parts.description.fontSize = 20;
      parts.description.lineHeight = { unit: 'PERCENT', value: 140 };
      parts.description.resize(1510, 1);
      parts.description.textAutoResize = 'HEIGHT';
      const group = parts.title.parent;
      group.layoutMode = 'VERTICAL';
      group.primaryAxisSizingMode = 'AUTO';
      group.counterAxisSizingMode = 'FIXED';
      group.itemSpacing = 4;
      group.resize(1510, 1);
      group.clipsContent = false;
      let divider = contents.findOne(node => node.name === 'Contents / Divider ' + index && node.type === 'RECTANGLE');
      if (!divider) {
        divider = dividerTemplate.clone();
        contents.appendChild(divider);
        divider.name = 'Contents / Divider ' + index;
      }
      divider.resize(1720, 1);
      divider.x = 100;
      divider.y = TOP + (index + 1) * HEIGHT;
    }

    setProjectNumber(golaba, '07');
    setProjectNumber(honbot, '08');
    setProjectNumber(driving, '09');
    updateDriving(driving, drivingNodes);
    golaba.setPluginData(PROJECT_KEY, 'golaba');
    honbot.setPluginData(PROJECT_KEY, 'honbot');
    driving.setPluginData(PROJECT_KEY, 'driving');
    const order = [...BASE_IDS.map(id => byId.get(id)), golaba, honbot, driving];
    const managedIds = new Set([...order.map(node => node.id), CLOSING_ID]);
    // Keep any slides/assets a person added later; Figma requires every grid node.
    const extraNodes = getGrid().flat().filter(node => !managedIds.has(node.id));
    await setGrid([[...order, ...extraNodes, closing]]);
    contents.setPluginData(BUILD_KEY, 'nine-projects-v1');
    figma.currentPage.focusedSlide = honbot;
    figma.viewport.scrollAndZoomIntoView([honbot]);
    const count = getGrid().flat().filter(node => node.type === 'SLIDE').length;
    figma.closePlugin('완료: ' + count + '장 · 경험·교육·수상 반영 · 목차 9개 · HONBOT·RC카·ToonVoice 업데이트');
  } catch (error) {
    console.error(error);
    figma.closePlugin('포트폴리오 반영 중단: ' + (error instanceof Error ? error.message : String(error)));
  }
})();
