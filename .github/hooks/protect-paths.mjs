// PreToolUse 보호 경로 가드 — 설계: docs/02 §3.9, docs/03 C13
// 이 레포는 빌드 러너가 없는 문서·설계 레포이므로, hook 대상은 애플리케이션
// 코드가 아니라 "하네스 자산 자신"이다(불변 결정·단일 always-on 규칙·정규 상태 소스).
//
// 정책:
//   deny  — 단일 변경 경로(/finish)로만 바꿔야 하는 정규 상태 소스
//   ask   — 불변/준불변 자산. 사람 승인을 받아야만 편집(C1 위험 등급제)
//
// PROTECTED는 scripts/harness-doctor.mjs가 import 하여
// "문서가 주장하는 보호 경로 ↔ hook이 실제 차단하는 경로" 정합을 검사한다(§3.11).

import { pathToFileURL } from "node:url";

/** @typedef {{ path: string, decision: "deny"|"ask", reason: string }} ProtectedRule */

/** @type {ProtectedRule[]} */
export const PROTECTED = [
  {
    path: "feature_list.json",
    decision: "deny",
    reason:
      "feature_list.json은 정규 상태 소스입니다. status 변경은 /finish(.github/prompts/finish.prompt.md) 단일 경로로만 하세요(docs/02 §3.10).",
  },
  {
    path: ".github/copilot-instructions.md",
    decision: "ask",
    reason:
      "단일 always-on 전역 규칙은 준불변 자산입니다. 불변 규칙 변경은 사람 승인이 필요합니다(C1).",
  },
  {
    path: "docs/05-decision-log.md",
    decision: "ask",
    reason:
      "결정 로그의 채택 항목은 불변입니다. 새 결정은 추가하되 기존 채택 항목 수정은 사람 승인이 필요합니다(C1).",
  },
];

const WRITE_TOOLS =
  /^(Edit|Write|MultiEdit|create_file|replace_string_in_file|multi_replace_string_in_file|insert_edit_into_file|apply_patch|str_replace)/i;

/** stdin에서 들어온 도구 입력에서 파일 경로 후보를 뽑아 워크스페이스 상대 경로로 정규화. */
export function extractPaths(toolInput = {}) {
  const candidates = [
    toolInput.file_path,
    toolInput.filePath,
    toolInput.path,
    ...(Array.isArray(toolInput.replacements)
      ? toolInput.replacements.map((r) => r && (r.filePath || r.file_path))
      : []),
  ].filter((v) => typeof v === "string" && v.length > 0);

  const cwd = process.cwd().replace(/\\/g, "/");
  return candidates.map((p) => {
    let norm = p.replace(/\\/g, "/").replace(/^file:\/\//, "");
    if (norm.startsWith(cwd + "/")) norm = norm.slice(cwd.length + 1);
    return norm.replace(/^\.\//, "");
  });
}

/** 경로 목록을 보호 규칙과 대조해 가장 강한 결정을 반환. 매치 없으면 null. */
export function evaluate(paths) {
  let matched = null;
  for (const p of paths) {
    for (const rule of PROTECTED) {
      if (p === rule.path || p.endsWith("/" + rule.path)) {
        if (!matched || (matched.decision === "ask" && rule.decision === "deny")) {
          matched = rule;
        }
      }
    }
  }
  return matched;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), 2000); // 안전장치: stdin 미수신 시 행에이트 방지
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  const raw = await readStdin();
  let event = {};
  try {
    event = raw ? JSON.parse(raw) : {};
  } catch {
    process.exit(0); // 파싱 실패 시 차단하지 않음(과차단 회피)
  }

  const toolName = event.tool_name || event.toolName || "";
  if (toolName && !WRITE_TOOLS.test(toolName)) process.exit(0);

  const paths = extractPaths(event.tool_input || event.toolInput || {});
  const rule = evaluate(paths);
  if (!rule) process.exit(0);

  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: rule.decision,
      permissionDecisionReason: rule.reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
