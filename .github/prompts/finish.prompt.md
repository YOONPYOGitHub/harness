---
mode: agent
description: 작업 완료 단일 경로 — 검증 → feature_list.json 상태 갱신 → handoff → 커밋을 한 흐름으로 강제한다. 상태(status) 변경은 이 경로로만 한다.
---

# /finish — 완료 단일 경로

이 프롬프트는 [feature_list.json](../../feature_list.json)의 `status`를 바꾸는 **유일한 경로**다(설계: [docs/02 §3.10](../../docs/02-ghcp-harness-design.md)). 직접 `status`를 편집하지 말 것 — `PreToolUse` 가드가 `feature_list.json` 직접 편집을 차단한다.

아래 순서를 **그대로** 따른다. 각 단계는 앞 단계의 **실제 출력**을 근거로만 통과시킨다(self-eval 회피 — LLM 자기확신 금지).

## 1. 검증 (evidence before assertions)

이 저장소는 빌드·테스트 러너가 없는 문서·설계 레포다. 따라서 검증은:

1. 변경을 `git status --porcelain`과 diff로 명확히 한다.
2. `node scripts/harness-doctor.mjs`를 실행하고 **종료 코드 0 / "OK" 출력**을 확인한다.
3. 변경한 `.md`의 상대 링크·표 포맷이 유효한지 확인한다(`PostToolUse` 경고가 없어야 함).
4. JSON 변경 시 `node -e "JSON.parse(require('fs').readFileSync('feature_list.json','utf8'))"`로 파싱 통과를 확인한다.

> 하나라도 실패하면 **여기서 멈추고** 최소 수정 또는 에스컬레이션한다(C8). 같은 실패 자가수정은 최대 2회.

## 2. feature_list.json 상태 갱신

검증을 통과한 항목만 `status`를 한 단계 전진시킨다(`not-started` → `in-progress` → `done`). 근거 서술은 JSON이 아니라 문서(설계서·scenarios)에 둔다 — JSON에는 상태만.

## 3. Handoff

다음 세션이 이어받을 수 있도록 한 단락으로 요약한다: 무엇을 끝냈는지, 다음 후보(`not-started` 중 우선순위 최상), 알려진 미해결.

## 4. 커밋 (검증 통과 마일스톤에서만)

`git add`로 **정규 소스(feature_list.json)와 가독 소스(MD)를 같은 커밋**에 묶어 불일치를 막는다. green 상태가 곧 롤백 지점이다(C9).

- 커밋 메시지: 변경 요지 + 갱신한 feature id.
- `git push`·`--force`·`reset --hard` 등 **비가역·공유 영향** 작업은 하지 않는다. 필요하면 사용자 승인을 받는다(C1).

## 완료 기준

`harness-doctor` 통과 + 링크/포맷 유효 + feature_list.json과 문서가 같은 커밋으로 일치. 이 셋을 **실제 명령 출력으로 확인**했을 때만 완료를 선언한다.
