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

return {createdNodeIds:created,mutatedNodeIds:mutated,slides:built.map(n=>({id:n.id,name:n.name})),screens,issues:check()};
