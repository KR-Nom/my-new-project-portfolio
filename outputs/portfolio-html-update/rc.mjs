export const css = `
.rc-slide{background:#F5F4F0;color:#22272B;--rc-accent:#C66B26}
.rc-slide::before{content:'';position:absolute;left:0;top:0;bottom:0;width:11px;background:#EA002C}
.rc-slide .rc-heading{position:absolute;left:64px;top:43px;right:64px}
.rc-slide .rc-heading-row{display:flex;align-items:baseline;gap:68px}
.rc-slide .rc-number{font-size:64px;line-height:1.45;letter-spacing:-2px;font-weight:750;color:var(--rc-accent)}
.rc-slide h2{font-size:58px;line-height:1.45;margin:0;font-weight:750;letter-spacing:-2px}
.rc-slide .rc-definition{font-size:28px;line-height:1.5;letter-spacing:-.7px;font-weight:600;margin:15px 0 0}
.rc-slide figure{margin:0;position:absolute}
.rc-slide img{width:100%;height:100%;object-fit:contain;display:block}
.rc-slide .rc-car-photo{left:64px;top:236px;width:680px;height:510px;background:#fff}
.rc-slide .rc-track-photo{left:772px;top:236px;width:420px;height:236.308px;background:#eceae5}
.rc-slide figcaption{position:absolute;top:calc(100% + 12px);left:0;width:100%;font-size:17px;line-height:1.55;letter-spacing:-.15px;color:#666968}
.rc-slide figcaption a,.rc-slide .rc-data-caption a{text-decoration:none;border-bottom:1px solid #9d9e97}
.rc-slide .rc-flow{position:absolute;left:772px;top:570px;width:420px;display:flex;flex-direction:column;gap:22px}
.rc-slide .rc-flow-item{display:grid;grid-template-columns:37px 1fr;column-gap:15px;align-items:baseline}
.rc-slide .rc-flow-item>span{color:var(--rc-accent);font:700 17px/1.5 Arial,sans-serif}
.rc-slide .rc-flow-item strong{font-size:23px;line-height:1.45;letter-spacing:-.4px}
.rc-slide .rc-flow-item small{display:block;font-size:18px;line-height:1.5;color:#6f736e;font-weight:400;margin-top:3px}
.rc-slide .rc-data{position:absolute;left:64px;top:806px;width:1128px}
.rc-slide .rc-data-caption{font-size:17px;color:#616860;line-height:1.5;display:flex;justify-content:space-between;align-items:baseline;margin:0 0 13px}
.rc-slide .rc-data-caption>span:last-child{font-size:16px}
.rc-slide .rc-records{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.rc-slide .rc-record{display:flex;align-items:stretch;height:150px;background:#EAECE5;overflow:hidden}
.rc-slide .rc-record img{width:200px;height:150px;flex:none}
.rc-slide .rc-record-info{padding:18px 14px;display:flex;flex-direction:column;justify-content:space-between;flex:1}
.rc-slide .rc-record-info strong{font:700 16px/1.4 Arial,sans-serif;color:#565C52;letter-spacing:.4px}
.rc-slide .rc-record-info p{font-size:17px;line-height:1.7;margin:0;color:#30382F;white-space:nowrap}
.rc-slide .rc-record-info b{font:700 18px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.rc-slide .rc-details{position:absolute;left:1260px;top:244px;width:592px;display:flex;flex-direction:column;gap:31px}
.rc-slide .rc-detail h3{font:700 16px/1.45 Arial,sans-serif;color:var(--rc-accent);letter-spacing:.25px;margin:0 0 11px}
.rc-slide .rc-detail ol{font-size:24px;line-height:1.55;letter-spacing:-.4px;padding-left:29px;margin:0;display:flex;flex-direction:column;gap:6px}
.rc-slide .rc-detail li{padding-left:3px}
.rc-slide .rc-detail p{font-size:23px;line-height:1.65;letter-spacing:-.4px;margin:0}
.rc-slide .rc-detail:last-child p{font-size:21px;color:#60665F;line-height:1.65}
.rc-slide .rc-repo{position:absolute;left:64px;top:1021px;color:#5E6470;font:17px/1.45 Arial,sans-serif;text-decoration:none}
`;

/** Native HTML slide; asset receives a path relative to the workspace root. */
export function renderRC(asset) {
  const base = 'outputs/portfolio-rc-v2/';
  const nvidia = 'https://github.com/NVIDIA-AI-IOT/jetracer';
  const dataset = 'https://github.com/robocarstore/donkeycar-dataset';
  const samples = [
    { id: '7533', angle: '−0.625', throttle: '0.561' },
    { id: '1720', angle: '−0.008', throttle: '1.000' },
    { id: '4266', angle: '0.206', throttle: '1.000' },
  ];
  return `<div class="sheet" id="rc-car"><section class="slide rc-slide" contenteditable="true" aria-label="RC카 자율주행 프로젝트">
  <header class="rc-heading">
    <div class="rc-heading-row"><span class="rc-number">09</span><h2>RC카 자율주행</h2></div>
    <p class="rc-definition">직접 조립한 RC카에, 조이스틱으로 모은 주행 데이터를 학습시키다.</p>
  </header>
  <figure class="rc-car-photo">
    <img src="${asset(base + 'assets/jetracer-latrax.jpg')}" alt="카메라와 제어 보드를 장착한 실제 RC카. NVIDIA JetRacer 공개 하드웨어 구성 참고 사진." data-source="${nvidia}">
    <figcaption>공개 하드웨어 구성 참고 · <a href="${nvidia}" target="_blank" rel="noopener">NVIDIA JetRacer</a></figcaption>
  </figure>
  <figure class="rc-track-photo">
    <img src="${asset(base + 'assets/jetracer-track-frame-120.jpg')}" alt="흰색 차선을 따라 주행하는 실제 RC카의 트랙 장면. NVIDIA JetRacer 공개 영상 발췌." data-source="${nvidia}">
    <figcaption>흰 선 트랙 주행 참고 · <a href="${nvidia}" target="_blank" rel="noopener">NVIDIA JetRacer</a><br>공개 주행 영상에서 프레임 발췌</figcaption>
  </figure>
  <div class="rc-flow" aria-label="사용자 프로젝트의 제작과 학습 과정">
    <div class="rc-flow-item"><span>01</span><strong>차체 제작·조립<small>3D 프린팅 차체 + 구동 부품</small></strong></div>
    <div class="rc-flow-item"><span>02</span><strong>수동 주행·데이터 수집<small>조이스틱 조작값과 주행 장면 연결</small></strong></div>
    <div class="rc-flow-item"><span>03</span><strong>CNN 학습<small>흰 선을 따라가는 주행 동작 학습</small></strong></div>
  </div>
  <div class="rc-data">
    <p class="rc-data-caption"><span>공개 주행 데이터 예시 · <a href="${dataset}" target="_blank" rel="noopener">robocarstore</a> / <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></span><span>정규화 명령값 · 소수 셋째 자리 반올림</span></p>
    <div class="rc-records">${samples.map(sample => `<article class="rc-record"><img src="${asset(base + 'data-source/' + sample.id + '_cam-image_array_.jpg')}" alt="공개 RC카 카메라 원본 ${sample.id}번 프레임. 조향 ${sample.angle}, 스로틀 ${sample.throttle} 명령값과 짝을 이룸." data-source="${dataset}"><div class="rc-record-info"><strong>#${sample.id}</strong><p>조향 <b>${sample.angle}</b><br>스로틀 <b>${sample.throttle}</b></p></div></article>`).join('')}</div>
  </div>
  <div class="rc-details">
    <section class="rc-detail"><h3>PAIN POINT</h3><ol><li>주행 이미지와 조작값을 같은 시점으로<br>묶어 학습 데이터를 구성해야 함</li><li>직진·곡선 데이터 편중에 따라<br>흰 선 추종이 불안정해질 수 있음</li></ol></section>
    <section class="rc-detail"><h3>SOLUTION</h3><ol><li>조이스틱으로 직접 주행하며<br>주행 장면과 조작값을 함께 수집</li><li>데이터 재수집·증강으로 학습 자료를<br>보완하고 TensorFlow CNN 학습</li></ol></section>
    <section class="rc-detail"><h3>ROLE</h3><p>차체 제작·조이스틱 주행·CNN 학습<br>이번 구현: 이미지·조작값 웹·DB 도구</p></section>
    <section class="rc-detail"><h3>TECH STACK</h3><p>Python · TensorFlow · FastAPI · SQLite<br>조이스틱 · 카메라 · 3D 프린팅</p></section>
  </div>
  <a class="github rc-repo" href="https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/line-tracing-car" target="_blank" rel="noopener">https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/line-tracing-car</a>
  <!-- Public sample images are unmodified and paired with original records from robocarstore/donkeycar-dataset, commit debe6549eb2df1b24b7d9cd337f9e70771aed7ee, licensed CC BY 4.0. Values are rounded for display. These are third-party reference samples, not data captured by the portfolio owner.
  NVIDIA JetRacer imagery: Copyright (c) 2019, NVIDIA CORPORATION. All rights reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  -->
</section></div>`;
}
