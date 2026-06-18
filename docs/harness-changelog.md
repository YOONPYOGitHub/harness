# harness-changelog

> 하네스(규칙·hook·스크립트) 변경 이력. 각 항목은 **관찰된 실패/마찰**과 그에 대한 **최소 조임**을 함께 남긴다. 상상한 개선이 아니라 스티어링 루프([06 §2](06-harness-operating-plan.md))의 산출물만 기록한다. 원칙 4(하네스를 버전 관리한다).

형식: `날짜 — 관찰(빈도) → 변경 → 근거`

---

## 2026-06-18

- **관찰**: 보호 경로를 추가했는데 설계서([02](02-ghcp-harness-design.md))가 그 경로 리터럴을 누락 — 규칙 선언과 문서가 어긋난 거버넌스 드리프트(1회, 단 수동 점검으로만 발견됨).
  **변경**: [harness-doctor](../scripts/harness-doctor.mjs)가 [protect-paths](../.github/hooks/protect-paths.mjs)의 `PROTECTED`를 import해 docs/02 언급 여부를 교차검증하도록 유지하고, docs/02 §3.9에 보호 경로 목록을 명시.
  **근거**: 센서(harness-doctor)가 실재 드리프트를 잡음을 입증 → 거버넌스 가정이 검증됨(원칙 1·6).

- **관찰**: [validate-docs](../.github/hooks/validate-docs.mjs)가 백틱-파일명 휴리스틱으로 glob 패턴(`*.agent.md`)에 **과발화**(여러 번).
  **변경**: 백틱 휴리스틱 제거, **깨진 상대 링크 검사만** 유지(비차단 경고).
  **근거**: "감지 ≠ 자동 실행" / 과발화 hook은 신뢰를 깎는다([03 C13](03-synergy-conflict-design.md)). 관찰된 과발화에만 반응해 범위를 좁힘.

- **관찰**: harness-doctor 드리프트 점검이 **수동 실행에 의존** — 다음엔 새어나갈 위험.
  **변경**: [verify-done](../.github/hooks/verify-done.mjs)(Stop) 게이트가, 하네스 자산이 미커밋 상태일 때 harness-doctor를 실행하고 비정상 종료 시 종료를 차단(자기해소: 드리프트 수정 시 통과).
  **근거**: 위 드리프트 관찰의 재발 방지를 로컬 CI 등가물로 기계화(원칙 6). 범위를 하네스 자산 변경으로 한정해 과발화 방지([06 §4](06-harness-operating-plan.md)).
