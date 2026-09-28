const root='https://github.com/KR-Nom/my-new-project-portfolio';
const tree=p=>root+'/tree/main/'+p.split('/').map(encodeURIComponent).join('/');
export const githubProfile='https://github.com/KR-Nom';
export const portfolioRepository=root;
export const projectLinks={
 'Order Balance · 발주 판단':{label:'Order Balance',path:'LLM/order-balance',url:tree('LLM/order-balance')},
 'LLM 호출 비용 분석':{label:'LLM 비용 분석',path:'LLM/order-balance',url:tree('LLM/order-balance')},
 'Developer Prompt ER':{label:'Developer Prompt ER',path:'Langchain',url:tree('Langchain')},
 'PDF 문서 질의응답':{label:'PDF RAG',path:'LLM/rag',url:tree('LLM/rag')},
 'Text-to-SQL · LoRA':{label:'Text-to-SQL · LoRA',path:'sLLM',url:tree('sLLM')},
 'CNN 구조와 과적합':{label:'CNN 학습 비교',path:'skala-python-deep-learning',url:'https://github.com/KR-Nom/skala-python-deep-learning'},
 'QuizFlash · 스트리밍 API':{label:'QuizFlash',path:'Answer',url:tree('Answer')},
 '웹툰 보이스 스튜디오':{label:'ToonVoice · 웹툰 음성화',path:'projects/toonvoice',url:tree('projects/toonvoice')},
 'GOLABA · 접수와 AI 검수의 분리':{label:'GOLABA · MSA 설계',path:'MSA',url:tree('MSA')},
 '3-tier 게시판 · 컨테이너 실행':{label:'3-tier 게시판',path:'workspace/Day2',url:tree('workspace/Day2')},
 'HowToDo · 협업 사용설명서':{label:'HowToDo',path:'WebService',url:tree('WebService')},
 'SKALA Shop · 주문과 데이터 정합성':{label:'SKALA Shop',path:'Spring/Online-shoppingmall',url:tree('Spring/Online-shoppingmall')},
 'CourtCast · 현장 제보와 코트 비교':{label:'CourtCast',path:'WebService/Court',url:tree('WebService/Court')},
 '매출 EDA · 데이터에서 학습까지':{label:'매출 EDA',path:'skala-python-day2',url:'https://github.com/KR-Nom/skala-python-day2'},
 'PostgreSQL · 실행계획 기반 튜닝':{label:'PostgreSQL 튜닝',path:'DB/종합실습3',url:tree('DB/종합실습3')},
 'Weather Flow · 날씨 대시보드':{label:'Weather Flow',path:'Vue/skala-vue',url:tree('Vue/skala-vue')},
 'HONBOT·자율주행 · 학습 경험의 연결':{label:'HONBOT · 자율주행',path:'projects/ai-experience',url:tree('projects/ai-experience')},
 'AI 서비스 운영 · AIOps 확장 설계':{label:'AIOps 설계',path:'projects/aiops',url:tree('projects/aiops')}
};
