// hook 순수 로직 단위 테스트 — 설계: docs/02 §3.9, docs/04 G.
// 가드의 핵심 결정 로직(보호 경로 평가·문서 링크 검사)을 결정론적으로 검증한다.
// 의존성 없이 `node --test tests/`로 실행(이 레포는 빌드 러너가 없는 문서 레포).
// git 상태에 의존하는 함수(verify-done의 uncommittedStatusChange 등)는
// 비결정적이라 여기서 제외하고, 순수 함수만 검증한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluate, extractPaths } from "../.github/hooks/protect-paths.mjs";
import { checkMarkdown } from "../.github/hooks/validate-docs.mjs";

// --- protect-paths: 보호 경로 평가 ---

test("정규 상태 소스(feature_list.json)는 deny", () => {
  const paths = extractPaths({ filePath: "feature_list.json" });
  assert.deepEqual(paths, ["feature_list.json"]);
  assert.equal(evaluate(paths)?.decision, "deny");
});

test("하위 앱의 동명 feature_list.json은 미보호(과차단 회피)", () => {
  const paths = extractPaths({ filePath: "sandbox/task-cli/feature_list.json" });
  assert.equal(evaluate(paths), null);
});

test("단일 always-on 규칙은 ask", () => {
  const rule = evaluate(extractPaths({ filePath: ".github/copilot-instructions.md" }));
  assert.equal(rule?.decision, "ask");
});

test("hooks 디렉터리 전체는 prefix ask 보호", () => {
  for (const f of [".github/hooks/protect-paths.mjs", ".github/hooks/verify-done.mjs"]) {
    assert.equal(evaluate(extractPaths({ filePath: f }))?.decision, "ask", f);
  }
});

test("hooks 디렉터리 밖의 동명 접두는 미보호", () => {
  assert.equal(evaluate(extractPaths({ filePath: ".github/hooks-notes.md" })), null);
});

test("비보호 경로는 null", () => {
  assert.equal(evaluate(extractPaths({ filePath: "README.md" })), null);
});

test("다중 경로에서 deny가 ask보다 강함", () => {
  const rule = evaluate(["feature_list.json", ".github/copilot-instructions.md"]);
  assert.equal(rule?.decision, "deny");
});

// --- validate-docs: 깨진 상대 링크 검사 ---

test("깨진 상대 링크를 감지한다", () => {
  const dir = mkdtempSync(join(tmpdir(), "vd-"));
  try {
    const f = join(dir, "x.md");
    writeFileSync(join(dir, "real.md"), "hi\n");
    writeFileSync(f, "[ok](./real.md) and [bad](./nope-xyz.md)\n");
    const warns = checkMarkdown(f);
    assert.equal(warns.length, 1);
    assert.match(warns[0], /nope-xyz\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("외부·앵커 링크는 무시한다", () => {
  const dir = mkdtempSync(join(tmpdir(), "vd-"));
  try {
    const f = join(dir, "y.md");
    writeFileSync(f, "[h](https://example.com) [a](#sec) [m](mailto:x@y.z)\n");
    assert.equal(checkMarkdown(f).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
