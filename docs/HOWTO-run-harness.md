# 하네스 실행·테스트 가이드 (직접 해보기)

이 문서는 GHCP 하네스를 **직접 굴려보며 테스트**하는 방법을 단계별로 설명한다. 설계 근거가 아니라 *조작 방법*에 초점을 둔다. 배경은 [README.md](../README.md)와 [docs/02-ghcp-harness-design.md](02-ghcp-harness-design.md)를 본다.

> 한 줄 요약: 하네스는 별도 프로그램을 "실행"하는 게 아니라, **VS Code Copilot 채팅에서 에이전트(모드)를 골라 작업을 시키면**, `.github/`의 규칙·hooks·스킬이 그 작업에 자동으로 끼어드는 방식으로 작동한다.

## 0. 사전 준비

| 항목 | 확인 명령 | 기대 |
| --- | --- | --- |
| Node | `node -v` | v18+ (hooks·스크립트가 node 실행) |
| 저장소 루트 | `pwd` | 이 저장소 최상위에서 작업 |
| Git 상태 | `git status -sb` | 작업트리 확인(커밋은 검증 통과 시에만) |

VS Code에서 이 저장소를 **워크스페이스 루트로 열어야** `.github/`의 에이전트·instructions·hooks가 인식된다.

## 1. 두 가지 테스트 경로

하네스는 두 층위로 나눠 테스트한다.

1. **거버넌스·hooks 층 (터미널에서, 사람이 직접)** — Copilot 없이 `node`로 스크립트와 hook을 직접 실행해 "차단/허용/검증" 로직이 맞는지 본다. 결정론적이라 회귀 테스트에 적합하다. → [2장](#2-거버넌스hooks-직접-테스트-터미널)
2. **에이전트·대화 층 (VS Code Copilot 채팅에서)** — Plan/Build/Ask 모드를 골라 실제 작업을 시키고, 규칙·hooks가 끼어드는지 관찰한다. → [3장](#3-에이전트-대화-직접-테스트-vs-code)

## 2. 거버넌스·hooks 직접 테스트 (터미널)

Copilot 없이도 핵심 강제 로직을 사람이 직접 검증할 수 있다. 모두 저장소 루트에서 실행한다.

### 2-1. 거버넌스 검사

```bash
node scripts/harness-doctor.mjs
```

기대: 마지막 줄 `OK — harness-doctor 통과`, 종료 코드 0. 문서가 주장하는 보호 경로 ↔ hook 실제 차단 경로, 에이전트 수, 죽은 자산을 검사한다. 동작 정의는 [scripts/harness-doctor.mjs](../scripts/harness-doctor.mjs) 상단 주석.

### 2-2. 검증 앱 스모크

```bash
node scripts/smoke.mjs
```

기대: `sandbox/*` 앱 테스트를 일괄 실행. `node_modules` 없는 앱은 건너뛴다(실패 아님). 종료 코드 0.

### 2-3. hooks 직접 실행 (stdin으로 이벤트 흉내)

hooks는 표준입력으로 JSON 이벤트를 받아 표준출력으로 결정을 돌려준다. Copilot이 없을 때도 사람이 직접 입력을 흘려보내 동작을 확인할 수 있다.

보호 경로 가드 — 루트 정본은 차단(`deny`):

```bash
echo '{"tool_name":"create_file","tool_input":{"filePath":"feature_list.json"}}' \
  | node .github/hooks/protect-paths.mjs
```

같은 가드 — 하위 앱의 동명 파일은 허용(`allow`):

```bash
echo '{"tool_name":"create_file","tool_input":{"filePath":"sandbox/task-cli/feature_list.json"}}' \
  | node .github/hooks/protect-paths.mjs
```

승인 보호 경로(`ask`):

```bash
echo '{"tool_name":"replace_string_in_file","tool_input":{"filePath":"docs/05-decision-log.md"}}' \
  | node .github/hooks/protect-paths.mjs
```

각 hook의 매칭·이벤트 배선은 [.github/hooks/hooks.json](../.github/hooks/hooks.json)에 정의돼 있다. 나머지 hook(검증 게이트·문서 검사·세션 주입·핸드오프)도 같은 방식으로 stdin을 흘려 테스트한다.

| Hook | 이벤트 | 역할 |
| --- | --- | --- |
| [protect-paths.mjs](../.github/hooks/protect-paths.mjs) | PreToolUse | 보호 경로 쓰기 차단(deny)·승인요구(ask) |
| [validate-docs.mjs](../.github/hooks/validate-docs.mjs) | PostToolUse | 편집된 `.md`의 깨진 상대 링크 경고 |
| [verify-done.mjs](../.github/hooks/verify-done.mjs) | Stop | 검증 없는 완료 선언 차단(거버넌스 게이트) |
| [session-ready.mjs](../.github/hooks/session-ready.mjs) | SessionStart·UserPromptSubmit | 세션 시작 시 상태 주입 |
| [precompact-handoff.mjs](../.github/hooks/precompact-handoff.mjs) | PreCompact | 압축 직전 핸드오프 노트 보존 |

### 2-4. 검증 앱 단위 테스트 (선택)

```bash
cd sandbox/expense-cli && npm install && npm test
```

기대: vitest 통과. 다른 검증 앱은 [sandbox/task-cli](../sandbox/task-cli/README.md), [sandbox/expense-cli](../sandbox/expense-cli/README.md) 참고.

## 3. 에이전트 대화 직접 테스트 (VS Code)

여기서 "하네스가 작동한다"는 것은, **모드(에이전트)를 고르면 그 권한·규칙이 강제되고, 위험 작업에서 멈춰 서며, 검증 없이는 완료를 선언하지 않는** 동작을 뜻한다.

### 3-1. 모드(에이전트) 선택

VS Code Copilot Chat의 에이전트 선택기에서 다음 중 하나를 고른다.

| 모드 | 언제 | 권한(요지) |
| --- | --- | --- |
| Plan | 코드 안 고치고 조사·계획 | 읽기·검색·웹 (편집 불가) |
| Build | 실제 구현·검증 | 읽기·검색·**편집·실행**·todo |
| Ask | 가벼운 Q&A | 읽기·검색·웹 (편집 불가) |

정의 파일: [.github/agents/plan.agent.md](../.github/agents/plan.agent.md) · [.github/agents/build.agent.md](../.github/agents/build.agent.md) · [.github/agents/ask.agent.md](../.github/agents/ask.agent.md). Explore는 서브에이전트라 사용자가 직접 부르지 않는다.

### 3-2. 권한 강제 확인 (Plan 모드)

Plan 모드에서 "이 파일을 수정해줘"라고 시켜본다. → 기대: 편집 도구가 없어 **수정 대신 계획만** 제시한다. 모드 권한이 선언적으로 강제되는지 보는 테스트다.

### 3-3. 위험 등급제 확인 (Build 모드)

Build 모드에서 작은 변경을 시킨 뒤 "push 해줘"라고 한다. → 기대: `git push` 같은 **비가역·공유 작업은 사용자 승인을 요구**하고 자율로 진행하지 않는다(전역 규칙 6). 근거: [.github/copilot-instructions.md](../.github/copilot-instructions.md).

### 3-4. 검증 루프 확인 (Build 모드)

테스트가 있는 변경을 시킨다. → 기대: **기준선 → 편집 → 테스트 실행 → 신규 실패만 수정**, 같은 실패는 최대 2회까지만 자가수정 후 에스컬레이션. "컴파일됨"이 아니라 **테스트 통과**를 완료로 본다.

### 3-5. 완료 단일 경로 — `/finish`

작업이 끝나면 채팅에 `/finish`를 입력한다. → 기대: 검증 → [feature_list.json](../feature_list.json) 상태 갱신 → 핸드오프 → 커밋을 한 흐름으로 진행한다. 상태(`status`) 변경은 이 경로로만 한다(직접 편집은 PreToolUse 가드가 차단). 절차: [.github/prompts/finish.prompt.md](../.github/prompts/finish.prompt.md).

## 4. 직접 해보는 dogfood 시나리오 (권장)

하네스를 "쓰면서" 테스트하는 가장 좋은 방법은 작은 작업을 실제로 시켜보는 것이다. 미리 준비된 드라이런 시나리오가 있다: [examples/scenarios.md](../examples/scenarios.md) (버그·기능·리팩터링·테스트·문서 5종).

예시 흐름:

1. Plan 모드로 "examples/scenarios.md의 1번 시나리오 접근 계획을 세워줘" → 계획만 나오는지 확인.
2. Build 모드로 그 계획을 구현시키고 → 검증 루프가 도는지 확인.
3. `/finish`로 마무리 → 상태 갱신·커밋이 단일 경로로 도는지 확인.

## 5. hooks가 자동으로 안 걸릴 때

기계적 차단(자동 deny/ask)은 **VS Code Agent hooks (Preview)** 기능에 의존한다. 이 기능이 비활성인 환경에서는 hook이 자동 실행되지 않고 규칙이 *선언적*으로만 작동한다. 이때는 [2-3장](#2-3-hooks-직접-실행-stdin으로-이벤트-흉내)처럼 사람이 직접 stdin으로 hook을 돌려 로직을 검증하면 된다. 상세 제약: [README.md](../README.md)의 "Scope and non-goals".

## 6. 한 번에 돌리는 검증 묶음

직접 테스트 전후로 전체 정합을 빠르게 확인하는 명령:

```bash
node scripts/harness-doctor.mjs && node scripts/smoke.mjs && echo "ALL GREEN"
```

기대: 두 검사 모두 통과 후 `ALL GREEN`. 하나라도 실패하면 그 지점에서 멈춘다.
