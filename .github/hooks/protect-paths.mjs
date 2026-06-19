// PreToolUse 보호 경로 가드 — 설계: docs/02 §3.9, docs/03 C13
// 이 레포는 빌드 러너가 없는 문서·설계 레포이므로, hook 대상은 애플리케이션
// 코드가 아니라 "하네스 자산 자신"이다(불변 결정·단일 always-on 규칙·정규 상태 소스).
//
// 정책:
//   deny  — 단일 변경 경로(/finish)로만 바꿔야 하는 정규 상태 소스
//   ask   — 불변/준불변 자산. 사람 승인을 받아야만 편집(C1 위험 등급제)
//
// 매칭:
//   exact (기본) — 레포 루트 기준 정확 경로 일치
//   prefix         — 디렉터리 하위 전체 보호(가드 구현 자신 같은 자산 군)
//
// PROTECTED는 scripts/harness-doctor.mjs가 import 하여
// "문서가 주장하는 보호 경로 ↔ hook이 실제 차단하는 경로" 정합을 검사한다(§3.11).

import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve, relative, isAbsolute } from "node:path";

// 보호 규칙은 명시적으로 "레포 루트 기준 경로"다. hook 파일이 <root>/.github/hooks/에
// 있으므로 두 단계 위가 레포 루트. cwd가 하위 디렉터리여도 동일하게 판단하고,
// 하위 프로젝트의 동명 파일(예: sandbox/x/feature_list.json)을 과차단하지 않는다.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {{ path: string, decision: "deny"|"ask", reason: string, match?: "exact"|"prefix" }} ProtectedRule */

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
  {
    path: ".github/hooks/",
    match: "prefix",
    decision: "ask",
    reason:
      "이 디렉터리는 하네스의 기계적 강제(hooks) 구현입니다. 가드를 변경하면 강제력이 약해지므로 사람 승인이 필요합니다(C1·prefix 보호).",
  },
];

const WRITE_TOOLS =
  /^(Edit|Write|MultiEdit|create_file|replace_string_in_file|multi_replace_string_in_file|insert_edit_into_file|apply_patch|str_replace)/i;

/** stdin에서 들어온 도구 입력에서 파일 경로 후보를 뽑아 **레포 루트 상대 경로**로 정규화. */
export function extractPaths(toolInput = {}) {
  const candidates = [
    toolInput.file_path,
    toolInput.filePath,
    toolInput.path,
    ...(Array.isArray(toolInput.replacements)
      ? toolInput.replacements.map((r) => r && (r.filePath || r.file_path))
      : []),
  ].filter((v) => typeof v === "string" && v.length > 0);

  return candidates.map((p) => {
    const cleaned = p.replace(/\\/g, "/").replace(/^file:\/\//, "");
    const abs = isAbsolute(cleaned) ? cleaned : resolve(process.cwd(), cleaned);
    return relative(REPO_ROOT, abs).replace(/\\/g, "/");
  });
}

/** 한 경로가 규칙에 매치되는가. prefix 규칙은 디렉터리 하위 전체를 보호한다. */
export function ruleMatches(p, rule) {
  if (rule.match === "prefix") {
    const base = rule.path.replace(/\/$/, "");
    return p === base || p.startsWith(base + "/");
  }
  return p === rule.path;
}

/** 경로 목록을 보호 규칙과 대조해 가장 강한 결정을 반환. 매치 없으면 null. */
export function evaluate(paths) {
  let matched = null;
  for (const p of paths) {
    for (const rule of PROTECTED) {
      if (ruleMatches(p, rule)) {
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
