# GHCP Harness

GitHub Copilot(GHCP)에서 잘 작동하는 **AI 코딩 에이전트 하네스**를 설계하기 위한 리서치 & 설계 저장소.

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/01-harness-research.md](docs/01-harness-research.md) | 하네스 정의(narrow=eval vs broad=런타임), 인기 하네스 Star·아키텍처·강점 분석(런타임·eval·라우팅·CI 계열) 및 베스트 아이디어 종합·학습 순서 |
| [docs/02-ghcp-harness-design.md](docs/02-ghcp-harness-design.md) | 위 강점을 GHCP 커스터마이징 레이어로 재현하는 설계 청사진(모드 분리·서브에이전트·검증 루프·메모리·라우팅) |
| [docs/03-synergy-conflict-design.md](docs/03-synergy-conflict-design.md) | 아이디어 **조합**의 시너지/상충 분석 — 6개 텐션 축, 상충 매트릭스, 코딩에 멀티에이전트·중간 모델전환 비채택 결론, 다이얼 기본 구성 |
| [docs/04-operational-validation.md](docs/04-operational-validation.md) | 실제 VS Code/Copilot에서 에이전트·지침·스킬이 로드·동작하는지 확인하는 수동 운영 검증 체크리스트 |
| [docs/05-decision-log.md](docs/05-decision-log.md) | 외부 피드백의 채택·기각·보류 결정 로그(근거 포함) |
| [docs/06-harness-operating-plan.md](docs/06-harness-operating-plan.md) | 하네스를 **잘 작동시키는** 운영·진화 규율 — 스티어링 루프, 컴포넌트 ablation, 거버넌스 게이트, 의도적 보류와 도입 트리거 |

## 한눈에 보기 (Star 검증값, 2026-06-11)

**런타임/CLI/IDE 하네스(넓은 의미)**

1. opencode — 173k
2. gemini-cli — 105k
3. openai/codex — 90.2k
4. OpenHands — 76.4k
5. cline — 63k
6. goose — 48.7k
7. aider — 46k
8. continue — 33.6k (유지보수 종료)
9. Roo-Code — 24.2k (아카이브)

**연구·평가(eval) 하네스(좁은 의미)**: SWE-agent 19.5k · SWE-bench 5.1k · mini-swe-agent 5.1k(100줄, SWE-bench Verified >74%)

**특수 계열**: claude-code-router 34.9k(라우팅) · claude-code-action 7.9k(CI)

> 참고: system-prompts 모음 139k(프롬프트 설계 레퍼런스). 미검증(사용자 제공): OpenHarness ~13.7k, Kilo Code ~20k, awesome-agent-harness ~1.2k.

## 설계 핵심

- **3 모드**: Plan(읽기 전용 탐색) · Build(편집+검증) · Ask(Q&A) — `*.agent.md`의 `tools` 허용 목록으로 강제
- **Explore 서브에이전트**: 광범위 탐색을 격리해 메인 컨텍스트 보호(읽기 전용, `agents` allowlist)
- **검증 루프**: 기준선 → 편집 → 진단 → 테스트 → 자기수정(신규 실패만, 최대 2회) → 에스컬레이트
- **메모리 표준**: 항상 로딩 파일은 **단 하나**(`copilot-instructions.md` 또는 `AGENTS.md` — 둘 다 쓰지 않음) + 경로별 `*.instructions.md` + 온디맨드 `SKILL.md`

## 조합 설계 핵심 (시너지/상충)

- **6개 텐션 축**으로 상충을 환원: 자율↔통제 · 미니멀↔풍부 · 속도↔안전 · 정밀↔압축 · 연속성↔분산 · 광범위↔외과적
- **다이얼은 전역 고정 금지** — 모드·위험·크기로 조절. 충돌 시 우선순위: 연속성 > 통제·검증 > 속도 > 자율
- **확정 결론**: 코드 작성은 단일 스레드, 서브에이전트는 read-only 전용, 모델 라우팅은 작업 경계에서만 (Cognition·Anthropic 근거)

## 구현 파일 (`.github/`)

설계를 VS Code/Copilot 커스터마이제이션 파일로 구현한 결과물. 모든 파일은 표준 인식 경로인 `.github/` 아래에 있다.

| 파일 | 역할 |
| --- | --- |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | 단일 always-on 전역 규칙(불변용 최소 규칙) |
| [.github/agents/plan.agent.md](.github/agents/plan.agent.md) | Plan — 읽기 전용 탐색·계획(`[read, search, web, agent]`) |
| [.github/agents/build.agent.md](.github/agents/build.agent.md) | Build — 구현+검증(`[read, search, edit, execute, todo, agent]`) |
| [.github/agents/ask.agent.md](.github/agents/ask.agent.md) | Ask — 읽기 전용 Q&A(`[read, search, web]`) |
| [.github/agents/explore.agent.md](.github/agents/explore.agent.md) | Explore — 서브에이전트(`[read, search]`, user-invocable:false) |
| [.github/instructions/](.github/instructions/) | 경로별 규칙(typescript·tests·docs, `applyTo`) |
| [.github/skills/](.github/skills/) | 온디맨드 절차(test-debugging·release-checklist·repo-map) |
| [.github/hooks/](.github/hooks/) | **기계적 강제**(Agent hooks) — PreToolUse 보호경로 차단·PostToolUse 포맷 검사·Stop 검증 게이트 |
| [.github/workflows/harness-ci.yml](.github/workflows/harness-ci.yml) | **CI 하네스** — push·PR마다 harness-doctor·hook 테스트·스모크를 원격 강제(로컬 Preview 의존 보완) |
| [.github/prompts/finish.prompt.md](.github/prompts/finish.prompt.md) | `/finish` — 검증→상태 갱신→handoff→커밋 단일 완료 경로 |
| [feature_list.json](feature_list.json) | 하네스 자산 상태의 단일 정본(canonical state) |
| [scripts/harness-doctor.mjs](scripts/harness-doctor.mjs) | 거버넌스 검사 — 문서↔훅 보호경로·문서 번호·사장 자산 정합 (`node`로 실행) |
| [scripts/smoke.mjs](scripts/smoke.mjs) | 검증 앱 스모크 — `sandbox/*` 앱 테스트를 루트에서 일괄 실행(경량 센서) |
| [tests/hooks.test.mjs](tests/hooks.test.mjs) | hook 순수 로직 단위 테스트(`node --test`, 보호 경로 평가·문서 링크 검사) |
| [sandbox/task-cli/](sandbox/task-cli/) | 하네스 dogfood 검증 앱(Task CLI) + [세션 저널](sandbox/task-cli/HARNESS-SESSION-LOG.md) |
| [examples/scenarios.md](examples/scenarios.md) | 5개 드라이런 시나리오(버그·기능·리팩터링·테스트·문서) |

## Scope and non-goals

**현재 보장하는 것**

- 이 하네스는 `target: vscode` 중심이다. VS Code 대화형 워크플로(handoffs 버튼, 서브에이전트 호출)을 전제로 설계됐다.
- 항상 로드되는 전역 지침은 [.github/copilot-instructions.md](.github/copilot-instructions.md) **하나로** 유지한다. `AGENTS.md`는 현재 추가하지 않는다(이중 항상로딩은 안티패턴).
- 현재 목표는 Copilot custom agents·instructions·skills를 조합한 **policy harness**다.

**현재 보장하지 않는 것 (non-goals)**

- 이 저장소는 **자체 에이전트 런타임이 아니다.** SWE-agent/OpenHands처럼 sandbox·event-loop·ACI를 직접 구현하지 않는다.
- GitHub Copilot **cloud agent는 future target**이며, `handoffs`·`web`·`todo`·hooks 동작 차이가 있으므로 별도 검증 전에는 동일 동작을 보장하지 않는다(상세: [docs/02 §3.1](docs/02-ghcp-harness-design.md)).
- 기계적 강제는 **로컬 Agent hooks Preview**에 의존한다. 기능 비활성 환경에서는 hook이 선언적 정책으로만 작동하고 자동 차단은 일어나지 않는다.
- **CI 하네스**(harness-doctor·hook 단위 테스트·스모크)는 [.github/workflows/harness-ci.yml](.github/workflows/harness-ci.yml)로 push·PR마다 원격 강제된다(로컬 Agent hooks Preview 의존을 보완). 다만 GitHub Copilot **cloud agent의 원격 강제**와 sandbox guardrail은 여전히 **future roadmap**이다(근거: [docs/05-decision-log.md](docs/05-decision-log.md) 보류 항목).

## 상태

조사 → 설계 → 구현 완료. `.github/` 에이전트·규칙·스킬·**hooks**, [feature_list.json](feature_list.json), [scripts/harness-doctor.mjs](scripts/harness-doctor.mjs), 드라이런 시나리오까지 구축됨. 기계적 강제는 로컬 Agent hooks(Preview)와 **CI 하네스**([.github/workflows/harness-ci.yml](.github/workflows/harness-ci.yml))로 이중화되어 동작한다. 향후 확장은 설계서 7장의 cloud agent 원격 강제·sandbox guardrail.
