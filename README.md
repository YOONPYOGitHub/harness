# GHCP Harness

GitHub Copilot(GHCP)에서 잘 작동하는 **AI 코딩 에이전트 하네스**를 설계하기 위한 리서치 & 설계 저장소.

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/01-harness-research.md](docs/01-harness-research.md) | 하네스 정의(narrow=eval vs broad=런타임), 인기 하네스 Star·아키텍처·강점 분석(런타임·eval·라우팅·CI 계열) 및 베스트 아이디어 종합·학습 순서 |
| [docs/02-ghcp-harness-design.md](docs/02-ghcp-harness-design.md) | 위 강점을 GHCP 커스터마이징 레이어로 재현하는 설계 청사진(모드 분리·서브에이전트·검증 루프·메모리·라우팅) |
| [docs/03-synergy-conflict-design.md](docs/03-synergy-conflict-design.md) | 아이디어 **조합**의 시너지/상충 분석 — 6개 텐션 축, 상충 매트릭스, 코딩에 멀티에이전트·중간 모델전환 비채택 결론, 다이얼 기본 구성 |

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

- **3 모드**: Plan(읽기 전용 탐색) · Build(편집+검증) · Ask(Q&A) — `*.agent.md` 도구 제한으로 강제
- **Explore 서브에이전트**: 광범위 탐색을 격리해 메인 컨텍스트 보호
- **검증 루프**: 편집 → `get_errors` → 테스트 → 자기 수정
- **메모리 표준**: `AGENTS.md` + `*.instructions.md` + `SKILL.md`

## 조합 설계 핵심 (시너지/상충)

- **6개 텐션 축**으로 상충을 환원: 자율↔통제 · 미니멀↔풍부 · 속도↔안전 · 정밀↔압축 · 연속성↔분산 · 광범위↔외과적
- **다이얼은 전역 고정 금지** — 모드·위험·크기로 조절. 충돌 시 우선순위: 연속성 > 통제·검증 > 속도 > 자율
- **확정 결론**: 코드 작성은 단일 스레드, 서브에이전트는 read-only 전용, 모델 라우팅은 작업 경계에서만 (Cognition·Anthropic 근거)

## 상태

조사 → 설계 준비 단계 완료. 다음은 설계서 7장의 구현 로드맵(에이전트 파일 작성)부터 진행.
