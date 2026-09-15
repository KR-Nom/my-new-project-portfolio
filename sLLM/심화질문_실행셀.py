'''
작성자: 장현진
프로그램 설명: LoRA 학습 직후 Fine-Tuned 모델에 심화 질문을 입력하고 SQL 결과를 출력합니다.
실행 방법: LoRA 학습이 끝난 노트북 셀에서 `%run -i 심화질문_실행셀.py`를 실행합니다.
'''

advanced_questions = [
    "완료된 주문의 총 매출을 지역별로 보여줘.",
    "매출이 가장 높은 상품 카테고리 3개를 보여줘.",
    "2024년 1월부터 3월까지 월별 총 매출을 계산해줘.",
]

if "default_result" not in globals():
    raise NameError("default_result가 없습니다. 먼저 run_experiment() 학습 셀을 실행하세요.")

if "model" not in default_result:
    raise KeyError(
        "default_result에 학습 모델이 없습니다. "
        "run_experiment()의 result에 'model': trainer.model을 추가한 뒤 다시 학습하세요."
    )

trained_model = default_result["model"]

for question in advanced_questions:
    answer = generate_sql(trained_model, question)

    print("=" * 80)
    print("[심화 질문]", question)
    print("\n[Fine-Tuned 모델 SQL]\n", answer)
