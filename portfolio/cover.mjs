export function coverSlide() {
  const groups = [
    {
      number: '01',
      title: 'AI·모델',
      projects: [
        ['Order Balance', 2],
        ['LLM 호출 비용 분석', 3],
        ['Developer Prompt ER', 4],
        ['PDF 문서 질의응답', 5],
        ['Text-to-SQL · LoRA', 6],
        ['CNN 학습 비교', 7],
      ],
    },
    {
      number: '02',
      title: '제품·서비스',
      projects: [
        ['QuizFlash', 8],
        ['ToonVoice', 9],
        ['HowToDo', 12],
        ['SKALA Shop', 13],
        ['CourtCast', 14],
        ['Weather Flow', 17],
      ],
    },
    {
      number: '03',
      title: '데이터·운영',
      projects: [
        ['GOLABA', 10],
        ['3-tier 게시판', 11],
        ['매출 EDA', 15],
        ['PostgreSQL 성능 튜닝', 16],
        ['HONBOT·자율주행', 18],
        ['AIOps 확장 설계', 19],
      ],
    },
  ];

  return {
    name: '장현진 포트폴리오',
    class: 'cover contents-cover',
    html: `
      <h1 class="contents-cover-title" data-edit>장현진 포트폴리오</h1>
      <nav class="contents-cover-grid" aria-label="포트폴리오 목차">
        ${groups.map(group => `
          <section class="contents-cover-group">
            <h2 class="contents-cover-heading">
              <span class="contents-cover-number">${group.number}</span>
              <span data-edit>${group.title}</span>
            </h2>
            <ul class="contents-cover-list">
              ${group.projects.map(([name, slide]) => `
                <li><a class="contents-cover-link" href="#slide-${slide}" contenteditable="false">${name}</a></li>
              `).join('')}
            </ul>
          </section>
        `).join('')}
      </nav>
    `.replace(/[ \t]+$/gm, ''),
  };
}
