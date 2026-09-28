// HONBOT learning experience, developed from the user's original lecture + Q&A flow.
export const css = `
.hb-slide{background:#151d29;color:#f4f6fa;--hb-accent:#a6baff;letter-spacing:-.35px}
.hb-slide h2,.hb-slide h3,.hb-slide h4,.hb-slide p,.hb-slide figure{margin:0}
.hb-slide .hb-stripe{position:absolute;left:0;top:0;bottom:0;width:11px;background:#ea002c}
.hb-slide .hb-intro{position:absolute;left:64px;top:48px;width:545px;display:flex;flex-direction:column;gap:9px}
.hb-slide .hb-number{font:750 64px/1.45 Arial,var(--font);color:var(--hb-accent);letter-spacing:-2px}
.hb-slide .hb-title{font:750 60px/1.45 Arial,var(--font);letter-spacing:-2px}
.hb-slide .hb-definition{font-size:28px;line-height:1.5;font-weight:650;letter-spacing:-.7px}
.hb-slide .hb-details{position:absolute;left:64px;top:366px;width:545px;display:flex;flex-direction:column;gap:30px}
.hb-slide .hb-detail h3{font:700 15px/1.45 Arial,var(--font);color:var(--hb-accent);letter-spacing:.15px;margin-bottom:10px}
.hb-slide .hb-detail ol{margin:0;padding-left:28px;display:flex;flex-direction:column;gap:8px;font-size:23px;line-height:1.5;letter-spacing:-.5px}
.hb-slide .hb-detail p{font-size:21px;line-height:1.55;letter-spacing:-.4px}
.hb-slide .hb-detail:last-child p{font-size:20px;color:#a7b3c5}
.hb-slide .hb-app{position:absolute;left:666px;top:163px;width:1190px;height:784px;background:#f5f6fa;border-radius:15px;overflow:hidden;color:#273349;box-shadow:0 20px 70px #0002}
.hb-slide .hb-topbar{height:68px;background:#fff;border-bottom:1px solid #e8ebf1;padding:0 23px;display:flex;align-items:center;gap:11px}
.hb-slide .hb-symbol{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#6278df;color:#fff;font:750 23px/1 Arial,sans-serif}
.hb-slide .hb-brand{font:750 25px/1.4 Arial,var(--font);letter-spacing:-.7px;color:#26364d}
.hb-slide .hb-classroom{font-size:15px;color:#8590a0;margin-left:12px;padding-left:20px;border-left:1px solid #dfe3ea}
.hb-slide .hb-my-learning{font-size:15px;color:#63728a;margin-left:auto}
.hb-slide .hb-profile{display:grid;place-items:center;width:30px;height:30px;background:#edf0ff;border-radius:50%;font-size:13px;color:#6174bd;margin-left:10px}
.hb-slide .hb-course{position:absolute;left:22px;top:91px;width:668px;display:flex;justify-content:space-between;align-items:center}
.hb-slide .hb-course-label{font-size:13px;line-height:1.4;color:#7e889a;margin-bottom:5px}
.hb-slide .hb-course h3{font-size:22px;line-height:1.4;font-weight:700;letter-spacing:-.6px}
.hb-slide .hb-course-tag{font-size:13px;color:#6276b8;background:#e9edfb;padding:7px 11px;border-radius:5px}
.hb-slide .hb-player{position:absolute;left:22px;top:161px;width:668px;height:376px;background:#183b32;border-radius:10px;overflow:hidden;color:#f4f5e9}
.hb-slide .hb-board{position:absolute;inset:0 0 47px;background:radial-gradient(ellipse at 20% 20%,#31574c 0%,#23483d 65%,#1c3d34 100%)}
.hb-slide .hb-board-top{display:flex;align-items:center;justify-content:space-between;position:absolute;left:25px;right:25px;top:18px}
.hb-slide .hb-board-top strong{font-size:20px;line-height:1.45;font-weight:600;color:#f0f1de}
.hb-slide .hb-board-top span{font-size:12px;color:#c5d1bf;letter-spacing:1px}
.hb-slide .hb-graph{position:absolute;left:29px;top:48px;width:295px;height:225px}
.hb-slide .hb-math{position:absolute;left:360px;top:95px;width:274px;display:flex;flex-direction:column;gap:15px}
.hb-slide .hb-math>span{font-size:16px;color:#d7dfc5}
.hb-slide .hb-math>strong{font:400 35px/1.3 Georgia,'Times New Roman',serif;color:#fff5bd}
.hb-slide .hb-math>p{font-size:18px;line-height:1.7;color:#e4e9d4}
.hb-slide .hb-subtitle{position:absolute;left:21px;right:21px;bottom:12px;padding:9px 10px;background:#09261dc9;text-align:center;border-radius:4px;font-size:16px;line-height:1.5;color:#f7f8f0}
.hb-slide .hb-controls{position:absolute;left:0;right:0;bottom:0;height:47px;background:#17261f;display:flex;align-items:center;gap:15px;padding:7px 18px 0;font-size:12px;color:#e3e7e1;letter-spacing:.1px}
.hb-slide .hb-progress{position:absolute;left:0;right:0;top:0;height:3px;background:#53675d}
.hb-slide .hb-progress:before{content:'';display:block;width:39.67%;height:3px;background:#b8d4b4}
.hb-slide .hb-controls svg{width:15px;height:15px;flex:none}
.hb-slide .hb-time{font:500 12px/1.4 Arial,sans-serif}
.hb-slide .hb-controls .hb-spacer{flex:1}
.hb-slide .hb-tabs{position:absolute;left:22px;top:550px;width:668px;height:46px;border-bottom:1px solid #dde2eb;display:flex;gap:26px;align-items:stretch;font-size:15px;color:#8792a4}
.hb-slide .hb-tabs span{padding:10px 3px 11px}
.hb-slide .hb-tabs span:first-child{color:#536bc9;border-bottom:2px solid #647bde;font-weight:650}
.hb-slide .hb-notes{position:absolute;left:22px;top:610px;width:668px;display:flex;flex-direction:column;gap:9px}
.hb-slide .hb-note{height:49px;display:flex;align-items:center;gap:14px;background:#fff;padding:0 14px;border:1px solid #e8ebf1;border-radius:7px}
.hb-slide .hb-note.hb-current{background:#edf1ff;border-color:#d7defa}
.hb-slide .hb-note time{font:600 13px/1.4 Arial,sans-serif;color:#6479c8;background:#f0f3fd;padding:5px 7px;border-radius:4px}
.hb-slide .hb-note p{font-size:15px;color:#5d6a82}
.hb-slide .hb-note>span{margin-left:auto;font-size:12px;color:#929bad}
.hb-slide .hb-feedback-strip{position:absolute;left:22px;top:731px;width:668px;display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.4;color:#7d899e}
.hb-slide .hb-feedback-strip b{color:#6279bc;font-weight:600}
.hb-slide .hb-chat{position:absolute;left:710px;top:89px;width:458px;height:673px;background:#fff;border:1px solid #e2e7f0;border-radius:11px;overflow:hidden}
.hb-slide .hb-chat-header{height:73px;padding:15px 18px;border-bottom:1px solid #edf0f6;display:flex;align-items:center;gap:10px}
.hb-slide .hb-chat-icon{width:32px;height:32px;display:grid;place-items:center;background:#edf0ff;border-radius:10px;color:#697bd0;font-size:20px}
.hb-slide .hb-chat-header h3{font-size:18px;line-height:1.4;color:#30405c}
.hb-slide .hb-chat-header p{font-size:12px;line-height:1.4;color:#8793a7;margin-top:3px}
.hb-slide .hb-available{margin-left:auto;font-size:11px;color:#648876;background:#f0f7f1;padding:6px 8px;border-radius:12px}
.hb-slide .hb-available:before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#76ab8b;margin:0 5px 1px 0}
.hb-slide .hb-question{margin:16px 17px 13px 55px;padding:12px 15px;background:#eef1ff;border-radius:10px 10px 3px 10px}
.hb-slide .hb-question time{font:650 11px/1.4 Arial,var(--font);color:#7080b9}
.hb-slide .hb-question p{font-size:16px;line-height:1.55;margin-top:6px;color:#3e527e}
.hb-slide .hb-answer{margin:0 18px;color:#53637b}
.hb-slide .hb-answer-by{display:flex;align-items:center;gap:7px;font:700 12px/1.4 Arial,var(--font);color:#6f81cb;margin-bottom:9px}
.hb-slide .hb-answer-by span{display:grid;place-items:center;width:18px;height:18px;border-radius:5px;background:#eaf0ff;font-size:13px}
.hb-slide .hb-answer>p{font-size:15px;line-height:1.6;margin-bottom:10px;letter-spacing:-.35px}
.hb-slide .hb-equation{padding:12px 15px;border-left:3px solid #899beb;background:#f5f7fd;font:500 23px/1.4 Georgia,'Times New Roman',serif;color:#3c4e7e;margin-bottom:11px;border-radius:0 6px 6px 0}
.hb-slide .hb-actions{display:flex;gap:7px;margin-top:8px}
.hb-slide .hb-actions span{padding:6px 9px;background:#f3f5fa;border-radius:5px;font-size:11px;line-height:1.4;color:#7180a5;white-space:nowrap}
.hb-slide .hb-understood{margin:16px 18px 0;padding-top:13px;border-top:1px solid #edf0f5;display:flex;align-items:center;gap:6px}
.hb-slide .hb-understood>span{font-size:12px;color:#8792a3;margin-right:auto}
.hb-slide .hb-understood b{font-size:11px;line-height:1.4;padding:7px 9px;background:#f3f5fa;color:#7c89a4;border-radius:14px;font-weight:500}
.hb-slide .hb-understood b:first-of-type{background:#edf4ef;color:#6b8c75}
.hb-slide .hb-compose{position:absolute;left:14px;right:14px;bottom:14px;height:80px;border:1px solid #dce2f4;border-radius:9px;background:#fbfcff;padding:12px 13px}
.hb-slide .hb-compose>p{font-size:13px;line-height:1.4;color:#9da6b7}
.hb-slide .hb-compose-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:9px}
.hb-slide .hb-compose-bottom>span{font-size:11px;color:#7f8db0}
.hb-slide .hb-send{width:26px;height:26px;background:#6b7fda;border-radius:7px;display:grid;place-items:center;color:#fff;font-size:16px}
.hb-slide .hb-caption{position:absolute;left:666px;top:965px;width:1190px;font-size:16px;line-height:1.5;color:#a7b3c5}
.hb-slide .hb-github{position:absolute;left:64px;top:1020px;width:1792px;color:#b8c1c8;font:400 17px/1.45 Arial,var(--font);letter-spacing:0;text-decoration:none}
`;

const detail=(title,body)=>`<section class="hb-detail"><h3>${title}</h3>${body}</section>`;

export function renderHonbot(){
return `<div class="sheet" id="honbot"><section class="slide hb-slide" contenteditable="true" aria-label="HONBOT 온라인 강의 실시간 질의응답">
<div class="hb-stripe"></div>
<header class="hb-intro"><span class="hb-number">08</span><h2 class="hb-title">HONBOT</h2><p class="hb-definition">강의를 보다가 생긴 궁금증,<br>그 자리에서 바로 묻다.</p></header>
<div class="hb-details">
${detail('PAIN POINT','<ol><li>모르는 개념을 찾느라 강의 흐름이 끊김</li><li>질문했던 구간과 답변을 다시 찾기 번거로움</li></ol>')}
${detail('SOLUTION','<ol><li>강의 옆에서 즉시 질문하고 후속 질문</li><li>질문 시점을 함께 남겨 해당 구간 복습</li><li>이해도·의견을 저장해 학습 기록으로 연결</li></ol>')}
${detail('ROLE','<p>당시 ChatGPT API 연동 학습<br>이번 구현: 영상·시점별 질문·복습·피드백 DB</p>')}
${detail('TECH STACK','<p>HTML · FastAPI · SQLite<br>로컬 Qwen·MLX · 강의 근거 검색</p>')}
</div>
<div class="hb-app" aria-label="실제 HONBOT 강의 플레이어와 질문 패널을 바탕으로 재구성한 화면">
  <header class="hb-topbar"><span class="hb-symbol">h</span><strong class="hb-brand">HONBOT</strong><span class="hb-classroom">클래스룸</span><span class="hb-my-learning">내 학습</span><span class="hb-profile">현</span></header>
  <div class="hb-course"><div><p class="hb-course-label">수학 · 미적분 기초</p><h3>03. 미분의 의미와 순간변화율</h3></div><span class="hb-course-tag">개념 강의</span></div>
  <div class="hb-player" aria-label="미분 강의의 31초 장면">
    <div class="hb-board"><div class="hb-board-top"><strong>접선의 기울기와 미분계수</strong><span>CALCULUS</span></div>
      <svg class="hb-graph" viewBox="0 0 295 225" role="img" aria-label="함수 y=x² 위 x=2인 점에서 기울기 4인 접선">
        <g stroke="#91ac93" stroke-width="1" opacity=".7"><path d="M28 196H279M48 210V8" fill="none"/><path d="m275 192 5 4-5 4m-231-184 4-7 4 7" fill="none"/></g>
        <path d="M48 196 Q129 196 210 13.75" fill="none" stroke="#edf0d4" stroke-width="2.8"/>
        <path d="M102 196 223.5 13.75" fill="none" stroke="#f6d683" stroke-width="2.4"/>
        <path d="M156 115V196M48 115H156" fill="none" stroke="#a8bd9f" stroke-dasharray="4 5" stroke-width="1.2"/>
        <circle cx="156" cy="115" r="4.5" fill="#f6d683"/>
        <g fill="#e0e8cc" font-family="Georgia,serif" font-size="16"><text x="10" y="21">y</text><text x="278" y="216">x</text><text x="33" y="215">0</text><text x="152" y="216">2</text><text x="31" y="120">4</text><text x="205" y="73">y = x²</text><text x="164" y="106">(2, 4)</text></g>
      </svg>
      <div class="hb-math"><span>x = 2 에서의 순간변화율</span><strong>f′(2) = 4</strong><p>곡선 위 한 점에서 그은<br>접선의 기울기를 구합니다.</p></div>
      <p class="hb-subtitle">“x가 2일 때, 이 접선의 기울기는 4가 됩니다.”</p>
    </div>
    <div class="hb-controls"><div class="hb-progress"></div><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zm5 0h3v10H9z" fill="currentColor"/></svg><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2zM11 5q4 3 0 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span class="hb-time">00:31 / 01:00</span><span class="hb-spacer"></span><span>1.0×</span><span>자막</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6V1h5m4 0h5v5M1 10v5h5m4 0h5v-5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
  </div>
  <div class="hb-tabs"><span>내 질문</span><span>강의 목차</span><span>복습</span><span>학습 피드백</span></div>
  <div class="hb-notes"><div class="hb-note"><time>00:15</time><p>평균변화율과 순간변화율은 어떻게 다른가요?</p><span>↗</span></div><div class="hb-note hb-current"><time>00:31</time><p>x가 2일 때 기울기가 왜 4가 되나요?</p><span>지금 질문</span></div></div>
  <div class="hb-feedback-strip"><b>학습 피드백</b><span>어려웠던 구간과 질문을 내려받아 전달하기</span><span aria-hidden="true">→</span></div>
  <aside class="hb-chat"><header class="hb-chat-header"><span class="hb-chat-icon">✦</span><div><h3>강의 중 바로 질문</h3><p>궁금한 개념을 HONBOT에게 물어보세요.</p></div><span class="hb-available">질문 가능</span></header>
    <div class="hb-question"><time>00:31 · 미분계수</time><p>x가 2일 때 기울기가 왜 4가 되나요?</p></div>
    <div class="hb-answer"><div class="hb-answer-by"><span>h</span>HONBOT</div><p>지금 보는 <b>f(x) = x²</b>에서 x = 2일 때의<br>접선 기울기를 구하는 장면이에요.</p><div class="hb-equation">f′(x) = 2x &nbsp; → &nbsp; f′(2) = 4</div><p>x가 2에서 아주 조금 변할 때, 함수값은<br>그 변화량의 약 4배만큼 변한다는 뜻이에요.</p><div class="hb-actions"><span>↶ 00:31 구간 다시 보기</span><span>＋ 복습에 저장</span></div></div>
    <div class="hb-understood"><span>설명이 이해되셨나요?</span><b>이해했어요</b><b>한 번 더 설명</b></div>
    <div class="hb-compose"><p>이 부분을 더 쉽게 설명해 주세요…</p><div class="hb-compose-bottom"><span>◷ 00:31 시점과 함께 질문</span><span class="hb-send" aria-label="질문 전송 화면 요소">↑</span></div></div>
  </aside>
</div>
<p class="hb-caption">실제 구현한 60초 강의·시점별 질의응답을 편집 가능한 HTML 화면으로 재구성</p>
<a class="github hb-github" href="https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/honbot" target="_blank" rel="noopener">https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/honbot</a>
</section></div>`;
}
