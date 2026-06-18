// PostToolUse 문서 포맷 검사 — 설계: docs/02 §3.9, docs/03 C13
// 편집된 .md 파일의 깨진 상대 링크만 비차단 경고로 알린다.
// 고신호 검사 하나만 둔다 — over-firing→알림 피로는 C13이 경고하는 안티패턴이다
// (백틱 파일참조 같은 저신호 휴리스틱은 의도적으로 두지 않는다). 차단하지 않는다.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

export function checkMarkdown(filePath) {
  const warnings = [];
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return warnings;
  }
  const dir = dirname(filePath);

  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    target = target.split("#")[0].replace(/%20/g, " ");
    if (!target) continue;
    const abs = isAbsolute(target) ? target : resolve(dir, target);
    if (!existsSync(abs)) warnings.push(`깨진 상대 링크: ${m[1].trim()}`);
  }
  return warnings;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
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
    process.exit(0);
  }

  const input = event.tool_input || event.toolInput || {};
  const file = input.file_path || input.filePath || input.path;
  if (!file || !/\.md$/i.test(file)) process.exit(0);

  const warnings = checkMarkdown(file);
  if (warnings.length === 0) process.exit(0);

  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `문서 포맷 경고(${file}):\n- ` + warnings.join("\n- "),
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0); // 비차단
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
