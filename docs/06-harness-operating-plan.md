# 06 — 하네스 운영·진화 계획 (작동 우선)

> 이 문서는 "어떻게 하면 하네스가 **실제로 잘 작동하는가**"를 정의한다. 더 많은 컴포넌트를 쌓는 계획이 아니라, **이미 만든 것이 진짜 실패를 잡는지 검증하고, 안 잡는 것은 덜어내는** 운영 규율이다. 근거: [02 §3.9~3.11](02-ghcp-harness-design.md), [03 C13](03-synergy-conflict-design.md), wikidocs 12장 원칙 1~6.

## 1. 핵심 원칙 — 관찰된 실패에서 하네스가 나온다

1. **점수는 목표가 아니라 대리지표다.** [04](04-operational-validation.md)·평가 축은 "어디가 운영 이력 없이 선제 구축됐는가"를 드러내는 **진단 도구**다. 점수 자체를 좇으면 Goodhart 함정(측정이 목표가 되면 측정이 망가짐)에 빠진다 — 예: harness-doctor를 통과시키려 문서 수치를 끼워맞추는 정합성 위장.
2. **스티어링 루프(Martin Fowler).** 어떤 마찰이 **여러 번 반복되면**, 그때 그 마찰을 겨냥한 제어를 추가한다. 책상에서 상상한 실패가 아니라, **이 저장소에서 실제로 관찰된 실패**에만 반응한다(wikidocs 12.4 ④).
3. **컴포넌트는 가정을 인코딩한다(원칙 1).** 모든 hook·스크립트는 "모델이 혼자서는 못 하는 무언가"에 대한 가정이다. 그 가정은 **검증되어야 살아남는다**. 모델이 좋아지면 가정이 낡으므로, 주기적으로 ablation으로 재검증한다.

## 2. 스티어링 루프 — 관찰 → 기록 → 조이기

```
실제 작업으로 하네스를 돌린다(dogfood)
   → 마찰/실패를 관찰한다
   → harness-changelog.md 에 기록한다 (관찰 사실 + 빈도)
   → 반복되면, 그 실패에만 맞춰 최소한으로 조인다 (hook/규칙/스크립트)
   → 추가한 장치는 다음 ablation 대상이 된다
```

- 단일 관찰은 기록만 한다. **반복**될 때 비로소 기계화한다(과설계 방지).
- 모든 하네스 변경은 [harness-changelog.md](harness-changelog.md)에 근거(관찰)와 함께 남긴다(원칙 4).

## 3. 컴포넌트 ablation — 현재 6 hook이 자기 자리를 버는가

2026-06-18 실측(stdin 주입으로 결정 출력 확인). 판정 기준: "이 컴포넌트가 막으려는 실패가 실재하고, 실제로 막는가."

| 컴포넌트 | 인코딩한 가정 | 실측 | 판정 |
| --- | --- | --- | --- |
| [protect-paths](../.github/hooks/protect-paths.mjs) (PreToolUse) | 모델이 정규 상태/불변 자산을 직접 고친다 | deny·ask·allow 정확 동작 | **유지** (고가치) |
| [verify-done](../.github/hooks/verify-done.mjs) (Stop) | 검증 없이 완료 선언한다 | 미커밋 차단·재진입 통과 | **유지** (고가치) |
| [protect-paths]·[hooks.json](../.github/hooks/hooks.json) 배선 | 규칙은 선언만으론 안 지켜진다 | harness-doctor가 배선 확인 | **유지** |
| [session-ready](../.github/hooks/session-ready.mjs) (SessionStart/Prompt) | 세션 시작 시 상태를 잊는다 | 요약 주입 동작 | **유지(한계)** — deps 충족 다음후보 자동계산은 미구현 |
| [precompact-handoff](../.github/hooks/precompact-handoff.mjs) (PreCompact) | 압축이 load-bearing 컨텍스트를 날린다 | 안내 주입 동작 | **유지(한계)** — 휘발성, 영속 산출물 없음 |
| [validate-docs](../.github/hooks/validate-docs.mjs) (PostToolUse) | 깨진 링크가 새어나간다 | broken 감지·clean 통과 | **유지(주변)** — 가치 낮음, 과발화 1회 깎아냄 |

> 판정: 현재는 6개 모두 자리를 번다. 단 아래 셋은 **주변/한계**이며, 모델 발전이나 무용 관찰 시 **제거 1순위**다 — validate-docs, session-ready의 미사용 부분, precompact의 휘발성.

## 4. 거버넌스 게이트 — 검증을 기계화 (관찰 근거 있음)

**관찰된 실패(2026-06-18)**: 설계서가 보호 경로 하나를 누락한 드리프트를 [harness-doctor](../scripts/harness-doctor.mjs)가 잡았다. 단, 이는 사람이 **수동으로** 돌렸기에 잡힌 것이다. 수동에 의존하면 다음엔 새어나간다. → 로컬 CI 등가물로 **Stop 게이트에 harness-doctor를 결합**해, 하네스 자산이 바뀐 채 드리프트가 있으면 종료를 막는다(원칙 6). 자기해소: 드리프트를 고치면 통과한다.

이는 §3의 ablation 규율과 충돌하지 않는다 — **한 번 관찰된, 재발 위험이 분명한** 실패에 대한 최소 조임이기 때문이다.

## 5. 의도적 보류와 도입 트리거

아래는 평가에서 약하게 나온 축이지만, **지금 채우면 과설계**다. 각 항목은 "도입 트리거(관찰)"가 충족될 때만 만든다.

| 보류 항목 | 평가 축 | 도입 트리거(이게 관찰되면 만든다) |
| --- | --- | --- |
| 센서 표면(init.sh·E2E·스모크) | ⑤ | 이 저장소에 **실행 대상(앱/런너)** 이 생길 때. 문서 레포인 한 영구 보류 |
| 영속 handoff 디렉터리 | ⑦ | 세션 인계 누락으로 **같은 작업을 다시 시작**하는 마찰을 실제로 겪을 때 |
| 별도 Evaluator(검증자 분리) | ⑩ | self-eval 후한 판정이 **실제로 통과**된 사례가 나올 때 |
| deps 충족 다음후보 자동계산 | ② | 다음 작업 선택이 **틀린** 사례가 나올 때(현재 항목 적어 수동으로 충분) |
| 자동 GC(중복·죽은코드) | ⑫ | 패턴 드리프트가 **반복 관찰**될 때 |

> 보류도 결정이다. "왜 지금 안 하는가"가 적혀 있지 않으면 그것도 드리프트의 씨앗이다(원칙 6). 그래서 트리거를 명시한다.

## 6. self-eval 회피 (재확인)

완료 판정은 LLM 자기확신이 아니라 **실제 명령 출력**(테스트 로그·링크검사·harness-doctor 출력)을 인용해서만 내린다. Stop 게이트도 같은 모델이 답하므로, 게이트의 통과 근거는 항상 인용 가능한 출력이어야 한다([02 §3.9](02-ghcp-harness-design.md) 규칙 4).

## 7. 이 계획의 실행 범위 (이번 작업)

관찰 근거가 있는 저비용 항목만 실행하고, 나머지는 §5로 보류한다.

1. 이 문서(docs/06) — 운영 규율의 단일 소스.
2. [harness-changelog.md](harness-changelog.md) 신설 — 실제 관찰 2건(드리프트 포착, validate-docs 과발화 수정)으로 시드.
3. [verify-done](../.github/hooks/verify-done.mjs)에 harness-doctor 게이트 결합(§4).
4. 문서↔구현 정합 갱신([02](02-ghcp-harness-design.md)·[README](../README.md)·[feature_list.json](../feature_list.json)) 후 harness-doctor green 확인.
