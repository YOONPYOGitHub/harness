# AI 코딩 에이전트 하네스 리서치

> 조사 시점: 2026-06 / GitHub Star 및 커뮤니티(레딧·HN) 언급 기준
> 목적: GitHub Copilot(GHCP)에서 잘 작동하는 하네스를 설계하기 위한 사전 조사

---

## 0. 용어 정리: "하네스(Harness)"란?

하네스는 LLM 자체가 아니라, **LLM을 실제 코딩 작업에 쓸 수 있게 감싸는 실행 골격(scaffold)** 을 말한다.
모델 가중치는 거의 동일해도, 하네스 설계에 따라 SWE-bench 점수가 크게 갈린다. 하네스의 핵심 구성요소는 다음과 같다.

| 구성요소 | 설명 |
| --- | --- |
| 시스템 프롬프트 / 페르소나 | 에이전트의 역할·규칙·출력 형식 정의 |
| 도구(Tool) 세트 & ACI | 모델이 호출하는 도구 설계(파일 읽기/편집/터미널/검색 등) |
| 컨텍스트 관리 | 코드베이스를 모델 창에 어떻게 채울지(repo map, 검색, 요약) |
| 에이전트 루프 | 관찰 → 사고 → 행동(act) → 관찰의 반복 구조 |
| 안전장치 | 승인 게이트, 샌드박스, 체크포인트/undo |
| 메모리 | 프로젝트 규칙·관례 영속화(AGENTS.md 등) |
| 라우팅 | 작업 유형별 모델 선택(think/longContext/background 등) |
| 평가(eval) | 패치 적용 + 컨테이너 테스트로 성능 검증 |

### 좁은 의미 vs 넓은 의미

- **좁은 의미(narrow) = 평가 하네스(eval harness)**: SWE-bench처럼 모델이 만든 패치를 적용하고 Docker 환경에서 repo 테스트를 돌려 정답 여부를 채점하는 골격.
- **넓은 의미(broad) = 런타임/스캐폴드**: CLI·IDE·SDK로 컨텍스트 주입, 툴 호출, 권한/샌드박스, 메모리, retry, tracing까지 감싸 "모델을 실제 개발자처럼" 동작하게 하는 실행층.

> **하네스가 성능을 좌우한다**: 모델을 그대로 두고 하네스만 개선해도 점수가 크게 오른다. 커뮤니티 보고로는 Terminal-Bench 2에서 하네스 개선만으로 pass@1이 **69.7% → 77.0%** 로 상승한 사례가 있다(수치는 커뮤니티 발표 기준, 미검증). mini-swe-agent가 100줄로 SWE-bench Verified >74%를 내는 것도 같은 메시지다.

---

## 1. 인기 하네스 랭킹 (Star 검증값, 2026-06-11)

> **출처·신뢰도 규약**: Stars/상태는 각 행의 링크된 공개 GitHub 저장소를 `checked_at: 2026-06-11`에 직접 확인한 값이다. `상태`는 active(활성)·archived(보관)·read-only(유지보수 종료) 중 하나. §1.1~1.3은 **verified(검증)**, §1.4는 **unverified(미검증, 사용자 제공)**. Star 수는 빠르게 변하므로 추세로만 본다.

### 1.1 런타임/CLI/IDE 하네스 (넓은 의미)

| 순위 | 프로젝트 | Stars | 언어 | 형태 | 상태 | 라이선스 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [anomalyco/opencode](https://github.com/anomalyco/opencode) (구 `sst/opencode`) | **173k** | TypeScript | TUI + 데스크톱 + IDE | active | MIT |
| 2 | [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | **105k** | TypeScript | 터미널 CLI + IDE 연동 | active | Apache-2.0 |
| 3 | [openai/codex](https://github.com/openai/codex) | **90.2k** | Rust | 터미널 CLI | active | Apache-2.0 |
| 4 | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | **76.4k** | Python/TS | SDK + CLI + GUI + Cloud | active | MIT |
| 5 | [cline/cline](https://github.com/cline/cline) | **63k** | TypeScript | VS Code 확장 + CLI + SDK | active | Apache-2.0 |
| 6 | [block/goose](https://github.com/aaif-goose/goose) | **48.7k** | Rust | 데스크톱 + CLI + API | active | Apache-2.0 |
| 7 | [Aider-AI/aider](https://github.com/Aider-AI/aider) | **46k** | Python | 터미널 페어 프로그래밍 | active | Apache-2.0 |
| 8 | [continuedev/continue](https://github.com/continuedev/continue) | **33.6k** | TypeScript | VS Code/JetBrains/CLI | read-only | Apache-2.0 |
| 9 | [RooCodeInc/Roo-Code](https://github.com/RooCodeInc/Roo-Code) | **24.2k** | TypeScript | VS Code 확장 | archived (2026-05) | Apache-2.0 |

### 1.2 연구·평가(eval) 하네스 (좁은 의미)

| 프로젝트 | Stars | 분석 포인트 |
| --- | --- | --- |
| [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent) | **19.5k** | ACI(에이전트-컴퓨터 인터페이스) 설계의 원전. Princeton/Stanford. |
| [SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench) | **5.1k** | 코딩 에이전트 평가의 표준. Docker로 패치 적용 + repo 테스트. Verified=사람이 확인한 500문제. |
| [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | **5.1k** | 100줄·bash-only로 SWE-bench Verified **>74%**(Gemini 3 Pro). "최소 루프" 학습 최적. |

### 1.3 특수 계열: 라우팅 · CI 하네스

| 프로젝트 | Stars | 유형 | 분석 포인트 |
| --- | --- | --- | --- |
| [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) | **34.9k** | 라우팅 | Claude Code 요청을 작업 유형(default/background/think/longContext/webSearch/image)별로 다른 모델/프로바이더로 라우팅 + 요청·응답 transformer + 커스텀 라우터. |
| [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | **7.9k** | CI | PR/이슈에서 `@claude` 멘션으로 실행. 모드 자동 감지, 리뷰/구현, 구조화 JSON 출력, 진행률 체크박스, 사용자 인프라에서 실행. |

### 1.4 미검증 (사용자 제공, URL/수치 미확인)

- **OpenHarness** (~13.7k 주장) — 이름 그대로 "agent harness"를 표방(43 tools·hooks·subagents·memory·permission layer 주장). 공개 저장소 위치 확인 실패 → 검증 필요.
- **Kilo Code** (~20k 주장) — Roo/Cline/opencode 계열 all-in-one. 페이지 응답 비정상 → 검증 필요.
- **awesome-agent-harness** (~1.2k 주장) — 하네스 저장소 큐레이션 맵(탐색용). 소유자 미확인.

참고: [x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools) (**139k** ⭐) — Cursor, Claude Code, Devin, v0, Copilot 등 상용 도구의 유출 시스템 프롬프트 모음. 하네스의 *프롬프트 설계* 패턴을 역으로 학습하는 데 가장 많이 인용된다.

> 레딧 `r/ChatGPTCoding`, `r/cline`, HN 등에서 반복 비교·언급되는 상위권은 **aider, cline, Claude Code, Roo Code, opencode, OpenHands, Gemini CLI, Goose**다. Star 대비 화제성은 도구마다 달라(예: OpenHands는 Star 대비 레딧 언급이 적은 편), 정량 랭킹보다 "자주 비교되는가"의 보조 신호로만 본다.

---

## 2. 하네스별 심층 분석

### 2.1 opencode (173k) — "프로바이더 중립 + 클라이언트/서버"
> 저장소가 `sst/opencode` → `anomalyco/opencode`로 이관됨(2026-06 확인). 링크는 현재 정규 URL 기준.
- **build / plan 두 내장 에이전트를 `Tab`으로 토글**. `plan`은 읽기 전용으로 파일 편집을 거부하고 bash 실행 전 승인을 요구 → 낯선 코드베이스 탐색에 안전.
- **`@general` 서브에이전트**: 복잡한 검색·다단계 작업을 별도 컨텍스트로 위임해 메인 대화 오염 방지.
- **클라이언트/서버 아키텍처**: TUI는 단지 클라이언트. 덕분에 데스크톱 앱·IDE 플러그인·원격 실행을 동일 코어로 지원.
- 처음부터 **프로바이더 중립**(특정 모델 종속 X), LSP 인지.
- 강점: 확장성·이식성. 약점: 코어가 무거워 단순 작업엔 과함.

### 2.2 codex (90.2k) — "터미널 우선 + 강한 샌드박스"
- Rust 기반 경량 로컬 에이전트. ChatGPT 플랜 인증으로 바로 사용.
- **승인 정책 + 샌드박스**: 셸 실행 시 위험도에 따라 승인 요구. `AGENTS.md`로 프로젝트 메모리.
- 강점: 보안/성능, 단일 바이너리 배포. 약점: 터미널 외 경험은 별도(IDE/웹).

### 2.3 OpenHands (76.4k) — "이벤트 스트림 + 조립형 SDK"
- **Action / Observation 이벤트 스트림** 루프가 코어. 에이전트를 코드로 정의하고 로컬~클라우드 수천 개로 확장.
- SDK·CLI·로컬 GUI·Cloud·Enterprise로 계층화. SWE-bench 등 **연구·평가 인프라**가 강점.
- 강점: 연구 친화·재현성·조립성. 약점: 학습 곡선, 셋업 복잡.

### 2.4 cline (63k) — "Plan/Act 분리 + 휴먼 인 더 루프"
- **Plan 모드**(탐색·질문·전략 수립) ↔ **Act 모드**(실행) 토글. 모든 편집/명령은 승인 후 실행, auto-approve로 자율 실행 가능.
- **체크포인트**로 에이전트 작업 undo. 편집을 diff로 검토.
- 린터·컴파일러 오류를 작업 중 감시하여 import 누락·타입 불일치를 사전 수정.
- **`.clinerules` + Skills**: 프로젝트별 규칙/관례를 자동 로드, 필요 시 모델이 스킬을 로드.
- MCP·플러그인·멀티에이전트 팀·스케줄 에이전트까지 확장.
- 강점: IDE 통합·안전성·규칙 시스템이 매우 성숙. GHCP와 개념이 가장 가까움.

### 2.5 aider (46k) — "Repo Map + 편집 포맷 + Git"
- **Repo Map**: tree-sitter로 코드베이스 전체의 심볼 그래프를 만들고 랭킹해 모델에 "지도"를 저렴하게 제공 → 대형 프로젝트에서 강함.
- **편집 포맷**(diff / whole / udiff)을 모델·작업에 맞게 선택해 적용 신뢰도 확보.
- **Git 자동 커밋**(의미 있는 메시지) + **린트/테스트 루프**로 자기 수정.
- 강점: 기존 코드베이스 실전 작업, 정밀한 수술적 변경. 레딧/HN 인기 1위급.

### 2.6 Roo-Code (24.2k, 아카이브) — "페르소나 모드"
- cline에서 분기. **Code / Architect / Ask / Debug / Custom** 다중 페르소나 모드, `.roomodes`로 팀별 커스텀 모드 정의.
- **컨텍스트 컨덴싱**(창이 차면 요약). 2026-05 종료됐지만 "모드" 개념의 레퍼런스.

### 2.7 SWE-agent (19.5k) — "ACI(에이전트-컴퓨터 인터페이스)"
- 핵심 통찰: **도구는 사람이 아니라 모델을 위해 설계해야 한다(ACI)**. 사람용 CLI를 그대로 주지 않고, 모델이 실수 없이 쓸 수 있는 도구로 재설계.
- 단일 `yaml` 설정, 해킹 가능·연구 친화.
- **mini-swe-agent**: 단 100줄 파이썬·bash-only로 SWE-bench Verified **>74%**(Gemini 3 Pro) 달성 → "하네스는 단순할수록 강할 수 있다"는 증거. Meta·NVIDIA·IBM 등에서 채택.

### 2.8 Gemini CLI (105k) — "벤더 대형 CLI + 무료 티어"
- Google의 터미널 에이전트. 개인 계정 무료 티어(분당 60·일 1,000 요청), 100만 토큰 컨텍스트.
- 내장 툴: Google Search 그라운딩, 파일/셸, 웹 fetch. **MCP**·커스텀 확장·**서브에이전트**·스킬.
- `GEMINI.md` 컨텍스트 파일, **체크포인팅**(세션 저장/재개), **샌드박싱**, 신뢰 폴더(폴더별 실행 정책), GitHub Action 연동.
- 강점: 대형 벤더 통합·무료 접근성·헤드리스(`--output-format json/stream-json`).

### 2.9 Goose (48.7k) — "모델 중립 로컬 에이전트"
- Block 발 → **Linux Foundation(AAIF)** 로 이관. Rust. 데스크톱+CLI+API.
- **15+ 프로바이더**, **ACP**(구독 인증 재사용), **MCP** 70+ 확장, **recipes**(재사용 워크플로), **hooks**, `.goosehints`/`AGENTS.md`.
- 강점: 코드 외 범용(리서치·자동화)까지, 커스텀 배포판(distro) 구성.

### 2.10 claude-code-router (34.9k) — "라우팅 하네스"
- 풀 에이전트가 아니라 **요청 라우팅·변환 레이어**. Claude Code 요청을 작업 유형별로 다른 모델로 보냄: `default / background / think / longContext(>60K) / webSearch / image`.
- **transformer**로 프로바이더별 요청·응답 변환, **custom router 스크립트**, **서브에이전트 라우팅**(`<CCR-SUBAGENT-MODEL>`), GitHub Actions·비대화 모드.
- 시사점: "한 모델로 전부"가 아니라 **작업 성격에 맞춰 모델을 고르는 것**도 하네스의 핵심 차원.

### 2.11 SWE-bench & mini-swe-agent (각 5.1k) — "평가 하네스 표준"
- **SWE-bench**: 실제 GitHub 이슈로 모델을 평가. 코드베이스+이슈 → 패치 생성 → **Docker 컨테이너에서 repo 테스트**로 채점(재현성). Lite/Verified/Multimodal 데이터셋, 클라우드 평가(sb-cli/Modal).
- **mini-swe-agent**: 위 1.2 참조. 평가 하네스가 "좋은 런타임 하네스의 북극성"임을 보여줌 — 우리의 검증 루프 설계 기준.

### 2.12 claude-code-action (7.9k) — "CI 하네스"
- PR/이슈에서 Claude Code를 실행하는 **GitHub Action**. **모드 자동 감지**(질문 응답/리뷰/구현), **구조화 JSON 출력**(Action output으로 연결), 진행률 체크박스, OWASP 정렬 보안 리뷰 예제, 사용자 러너에서 실행.
- 시사점: 에이전트를 **CI 파이프라인의 일부**로 넣는 하네스 형태. GHCP의 향후 자동화 확장 참고.

---

## 3. 공통 패턴 = "베스트 아이디어" 종합

여러 하네스에서 반복 등장하는, GHCP 설계에 차용할 핵심 아이디어:

1. **모드 분리 (탐색 → 변경)**: Plan/Act(cline), build/plan(opencode), 페르소나 모드(Roo). 변경 전 읽기 전용 탐색.
2. **Repo Map / 랭킹 컨텍스트** (aider): 코드베이스 스켈레톤을 저렴하게 모델에 제공.
3. **ACI — 모델을 위한 도구 설계** (SWE-agent) + **미니멀리즘** (mini-swe-agent).
4. **체크포인트 / Undo** (cline): 자율 편집의 안전망.
5. **규칙 + 스킬 파일** (`.clinerules`, `.roomodes`, **AGENTS.md**): 프로젝트 메모리·관례.
6. **휴먼 인 더 루프 승인 게이트 + auto-approve 토글** (cline).
7. **이벤트 스트림 행동/관찰 루프 + 조립형 코어** (OpenHands).
8. **린트/테스트 피드백 루프** (aider): 컴파일·테스트 오류 자기 수정.
9. **Git 통합·의미 있는 커밋** (aider).
10. **서브에이전트로 병렬/스레드 탐색** (opencode `@general`): 메인 컨텍스트 보호.
11. **컨텍스트 컨덴싱/요약** (Roo): 창이 찰 때.
12. **샌드박스 + 셸 승인 정책** (codex).
13. **라우팅 레이어 — 작업별 모델 선택** (claude-code-router): think/longContext/background를 서로 다른 모델로. GHCP에서는 모델 피커와 에이전트별 권장 모델로 대응.
14. **평가(eval) 하네스를 북극성으로** (SWE-bench): 패치 + 컨테이너 테스트로 "정말 고쳐졌는가"를 기계적으로 검증 → 검증 루프의 최종 형태.
15. **CI 하네스** (claude-code-action): @멘션 트리거 + 모드 감지 + 구조화 출력로 에이전트를 파이프라인에 편입.

> **수렴 관찰**: `AGENTS.md`는 codex·opencode·Roo·OpenHands·Goose가 모두 채택한 사실상의 **크로스 툴 메모리 표준**이다. GHCP는 이미 `AGENTS.md` / `copilot-instructions.md` / `.instructions.md`를 지원하므로 정렬이 쉽다.

---

## 4. GHCP 관점의 시사점 (다음 단계로 연결)

GHCP는 이미 다음을 1급 기능으로 제공한다 — 즉, **하네스 코어를 새로 짤 필요 없이 "조립·설정"으로 상위 하네스 패턴을 재현**할 수 있다.

| 상위 하네스 패턴 | GHCP에서의 대응 수단 |
| --- | --- |
| Plan/Act·페르소나 모드 | `*.agent.md` 커스텀 에이전트(도구 제한 포함) |
| 규칙·스킬·메모리 | `copilot-instructions.md`(또는 `AGENTS.md`, 택1), `*.instructions.md`(applyTo), `SKILL.md` |
| ACI / 모델용 도구 | 내장 tool alias `read`/`search`/`edit`/`execute`/`web`/`todo` |
| Repo Map | `search` alias(코드베이스 의미 검색 + 텍스트 검색) 조합으로 근사 |
| 서브에이전트 | `agent` alias + `agents` allowlist (예: Explore) |
| 체크포인트/Undo | VS Code 변경 추적 + Git |
| 승인 게이트·샌드박스 | 도구 승인 UX + 위험 작업 확인 정책 + hooks(PreToolUse) |
| 기계적 강제 (OpenAI mechanical enforcement) | **Agent hooks**(`.github/hooks/*.json`): PreToolUse 차단·PostToolUse 검사·Stop 검증 게이트. Claude `.claude/settings.json` 포맷과 호환 → 직접 마이그레이션 |
| 린트/테스트 루프 | 진단(`get_errors` 상당) + `execute`(터미널) |
| 라우팅·모델 선택 (claude-code-router) | 모델 피커 + 에이전트별 권장 모델(`model:` frontmatter) |
| 평가(eval) 검증 (SWE-bench) | `execute`로 테스트·빌드 실행 + diff 검토(패치+테스트 통과를 완료 기준으로) |
| CI 하네스 (claude-code-action) | (향후) GitHub Actions에서 Copilot coding agent / 구조화 출력 |

> **Claude Code 하네스 마이그레이션**: VS Code Copilot은 Agent hooks를 Claude와 **같은 8개 이벤트**(SessionStart·UserPromptSubmit·PreToolUse·PostToolUse·PreCompact·SubagentStart·SubagentStop·Stop)으로 제공하고, `.claude/agents`·`.claude/rules`·`.claude/settings.json`·`.claude/skills`·`CLAUDE.md`를 자동 인식한다. 따라서 wikidocs([365038](https://wikidocs.net/365038))의 STEP 5 hooks·feature_list.json·`/finish` 패턴을 GHCP로 **거의 그대로 이식**할 수 있다(설계: [02 §3.9–3.11](02-ghcp-harness-design.md)).

> 도구 표기 주의: 위는 **실제 VS Code/Copilot tool alias**(`read`·`search`·`edit`·`execute`·`web`·`agent`·`todo`)다. `.agent.md`의 `tools:` 필드에 그대로 쓴다. 정확한 확장/MCP 도구 id는 Chat Diagnostics나 Agent Customizations 에디터에서 확인 후 고정한다.

➡️ 상세 설계는 [02-ghcp-harness-design.md](02-ghcp-harness-design.md) 참고.

---

## 5. 추천 학습·분석 순서

하네스를 제대로 이해하려면 **작고 순수한 것부터 큰 조립형으로** 올라가는 게 효율적이다.

1. **mini-swe-agent** (100줄) — 에이전트 루프의 최소 골격을 한 파일로 체내.
2. **SWE-agent** — ACI(모델용 도구 설계)의 원전.
3. **SWE-bench** — "검증"이 하네스의 일부임을 체화(패치+컨테이너 테스트).
4. **OpenHands** — 이벤트 스트림/조립형 코어, 연구·재현성.
5. **Cline / Goose** — IDE·데스크톱 통합, 규칙·스킬·승인 게이트의 성숙한 구현.
6. **opencode / Gemini CLI / codex** — 프로바이더 중립·클라이언트서버·샌드박스 등 대규모 런타임 설계.
7. **claude-code-router / claude-code-action** — 라우팅·CI 같은 특수 계층으로 확장.
