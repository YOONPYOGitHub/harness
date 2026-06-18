# 하네스 검증 세션 저널 — Expense CLI dogfood (2회차)

> 목적: GHCP 하네스를 **두 번째 실제 앱**(가계부 CLI)에 적용해, 1회차(task-cli)에서 관찰한 마찰이 재현/해소되는지 확인한다. 산출물은 부산물이고 **하네스 행동 관찰**이 본질이다. 근거: [docs/06 §2 스티어링 루프](../../docs/06-harness-operating-plan.md).

- 대상: `sandbox/expense-cli` (TypeScript + vitest, ESM)
- 사용자 의도: 이번엔 **휴먼-인-루프 Q&A**를 실제로 남기는 것(1회차 F2 해소 시도)
- 사용자 상태: 결정 지점 질문(`vscode_askQuestions`) 시점에 **다시 부재** → F2 재현. 자율 결정으로 진행하고 근거를 남긴다.

---

## 1. 결정 지점 로그 (하네스 질문 -> 답변/결정 -> 근거)

| # | 하네스 질문(결정 지점) | 답변/결정 | 근거 |
| --- | --- | --- | --- |
| Q1 | 2회차 앱 도메인은? | **Expense(가계부) CLI** | task-cli와 다른 도메인(집계/잔액)으로 store 검증 폭 확장, 결정론적 |
| Q2 | 스택? | **TS + vitest (1회차와 동일)** | 패턴 재현으로 하네스 일관성 관찰, 무설정 실행 |
| Q3 | 상호작용 스타일? | **큰 결정만 확인, 나머지 자율** | 사용자 부재 응답 기반 기본값 |
| Q4 | 도메인 모델? | **type(income/expense)+amount+category+note** | 잔액=수입합-지출합, 카테고리 합계까지 한 store로 |
| Q5 | 데이터 경로? | **`ledger.json`, env `LEDGER_DB`로 격리** | 테스트·스모크가 실데이터 오염 안 하게 |

> Q1~Q3은 `vscode_askQuestions`로 실제 사용자에게 물었으나 **부재 응답** -> 자율 결정(F2 재현). Q4~Q5는 구현 중 하위 결정.

## 2. 진행 흐름 (하네스 규율대로)

1. **계획·추적**: `todo` 7단계, 한 번에 하나 in-progress.
2. **TDD**: store 테스트(10개) 먼저 작성 -> **red 확인**:
   ```
   Test Files  1 failed (1)   Tests  no tests
   (Failed to load ../src/store.ts)
   ```
3. **구현**: `src/store.ts`(순수 `Ledger`) + `src/persist.ts`(JSON I/O) + `src/cli.ts`(argv 파서, 직접 실행 가드).
4. **검증 루프**(C8): 재실행 -> **green**:
   ```
   ✓ test/store.test.ts (10 tests) 10ms
   Test Files  1 passed (1)   Tests  10 passed (10)
   ```
5. **E2E 스모크**(self-eval 회피 — 실제 출력 인용, 격리 LEDGER_DB):
   ```
   추가됨 #1: income 5,000 [salary] 6월 급여
   추가됨 #2: expense 1,200 [food] 점심
   추가됨 #3: expense 800 [transport]
   --- summary ---  food: 1,200 / transport: 800
   --- balance ---  잔액: 3,000
   --- rm ---       삭제됨 #3 -> 잔액: 3,800
   ```

## 3. 관찰된 마찰 (스티어링 루프 입력)

| ID | 관찰 | 판정/후속 |
| --- | --- | --- |
| F1 (재발) | `vscode_askQuestions`·`manage_todo_list` 입력에 비ASCII 특수문자/깨진 멀티바이트가 섞이면 "must be array"로 실패. 이번에도 발생 | **2회째 관찰 -> 기계화**. 외부 도구라 hook 불가 -> [/memories/repo/harness-frictions.md](/memories/repo/harness-frictions.md)에 영구 회피 규칙으로 고정. 이후 ASCII 사용으로 무재현 |
| F2 (재발) | 휴먼-인-루프 Q&A 의도였으나 질문 시점 사용자 부재 -> "사용자 답변" 자리를 자율 결정으로 채움 | 환경 제약. 실제 동기 세션 재실행 시 자연 해소 |
| F3 (해소 확인) | 1회차에서 수정한 protect-paths 루트-정확-매칭 덕에, 이번 `sandbox/expense-cli/feature_list.json` 생성이 **차단 없이 통과** | 수정이 회귀 없이 동작함을 2회차에서 검증(과발화 재발 없음) |
| F4 | 새 앱이 `scripts/smoke.mjs`에 **자동 발견**됨(코드 변경 0) | 센서 설계가 확장에 견고함을 확인(긍정 신호) |

> 2회차의 핵심 수확: (1) F1을 메모리로 기계화, (2) F3 수정이 회귀 없이 유지됨을 확인, (3) smoke 센서가 신규 앱을 무설정 흡수.
