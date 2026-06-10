# 드라이런 시나리오

설계([docs/](../docs/))와 구현([.github/](../.github/))이 실제 작업에서 어떻게 맞물리는지 보여주는 5개 시나리오.
각 시나리오는 **모드 흐름 · 사용하는 에이전트/도구 · 적용되는 불변 규칙(C1~C9)**을 보여준다.

> 공통 전제: 항상 로드되는 규칙은 [.github/copilot-instructions.md](../.github/copilot-instructions.md). 모드는 [.github/agents/](../.github/agents/)의 커스텀 에이전트.

---

## 1. 버그 수정 (작고 가역적)

**상황**: "로그인 후 빈 화면이 뜬다"는 버그 리포트.

| 단계 | 모드 | 도구 | 핵심 |
| --- | --- | --- | --- |
| 1 | Plan | `search`, (필요 시) `agent`→Explore | 증상 재현 경로와 의심 파일 좁히기. 완료 기준 = "재현 테스트가 통과" |
| 2 | Build | `execute` | **기준선**: 관련 테스트 1회 실행, 기존 실패 기록 (C8) |
| 3 | Build | `edit` → 진단 → `execute` | 재현 테스트 작성 → 수정 → 통과 확인 |
| 4 | Build | `execute` | 검증 통과 후에만 커밋 (C9) |

**적용 규칙**: 가역·저영향이라 자율 진행(C1). 신규 실패만 수정, 기존 실패는 기록만(C8).

---

## 2. 작은 기능 추가

**상황**: "설정 화면에 다크 모드 토글 추가."

| 단계 | 모드 | 도구 | 핵심 |
| --- | --- | --- | --- |
| 1 | Plan | `search`, `web` | 기존 테마 처리 위치 파악, 접근법 1~2개 비교 후 추천 |
| 2 | Plan → Build | `handoffs` | 계획 승인 후 Build로 전환(작업 경계) |
| 3 | Build | `todo` | 다단계 작업 분해, 한 번에 하나 in-progress |
| 4 | Build | `edit`, `execute` | 구현 → 토글 동작 테스트 추가 → 검증 루프 |

**적용 규칙**: 계획은 채팅/PR 설명 같은 스크래치에 남김(C2 — always-on 파일엔 넣지 않음). 모드 전환은 작업 경계에서만(C4).

---

## 3. 대형 리팩터링 (광범위·주의 요함)

**상황**: "결제 모듈을 새 API로 마이그레이션."

| 단계 | 모드 | 도구 | 핵심 |
| --- | --- | --- | --- |
| 1 | Plan | `agent`→Explore(thorough) | 광범위 탐색을 **격리된 컨텍스트**에 위임해 메인 보호 (C2, C3) |
| 2 | Plan | — | 영향 범위·리스크·단계별 순서 산출. 큰 산출물은 파일/구조로 가리킴 |
| 3 | Build | `todo`, `edit`, `execute` | 작은 단위로 쪼개 **각 단위마다 검증 통과 시 커밋**(green = 롤백 지점, C9) |
| 4 | Build | — | 비가역 단계(브랜치 삭제·force-push 등)는 [release-checklist](../.github/skills/release-checklist/SKILL.md)로 승인 게이트 통과 (C1) |

**적용 규칙**: 코드 작성은 절대 위임하지 않음 — Explore는 read-only 탐색만(C3). 큰 변경일수록 외과적으로, 정리는 별도 PR(D6).

---

## 4. 테스트 실패 디버깅

**상황**: "CI에서 3개 테스트가 빨갛게 뜬다."

| 단계 | 모드 | 도구/스킬 | 핵심 |
| --- | --- | --- | --- |
| 1 | Build | [test-debugging](../.github/skills/test-debugging/SKILL.md) | 스킬 절차대로 기준선 수립 |
| 2 | Build | `execute` | 실패를 신규 vs 기존(pre-existing)으로 분류 |
| 3 | Build | `edit`, `execute` | 신규 실패만, 한 번에 한 가설로 수정 |
| 4 | Build | — | 같은 실패 자가수정 **최대 2회** → 안 되면 로그·diff·가설 동봉해 에스컬레이션 (C8) |

**적용 규칙**: 검증 루프 상한이 핵심. 추측으로 무한히 헤집지 않음(C8).

---

## 5. 문서 편집

**상황**: "README의 설치 안내를 최신화."

| 단계 | 모드 | 도구 | 핵심 |
| --- | --- | --- | --- |
| 1 | Ask 또는 Build | `read`, `search` | 현재 안내와 실제 동작의 차이 확인 |
| 2 | Build | `edit` | [docs.instructions.md](../.github/instructions/docs.instructions.md) 규칙 적용(파일 링크, 표 포맷, 출처 표기) |
| 3 | Build | — | 명령·경로가 실제와 일치하는지 확인 후 커밋 |

**적용 규칙**: 문서도 "근거 있는 변경". 미검증 수치는 "미검증"으로 표기.

---

> 이 시나리오들은 [docs/02 §3](../docs/02-ghcp-harness-design.md)의 컴포넌트 설계와 [docs/03 §6](../docs/03-synergy-conflict-design.md)의 다이얼 기본 구성을 실제 작업 흐름으로 보여주기 위한 것이다.
