// PreCompact handoff 덤프 — 설계: docs/02 §3.9, C2 보강
// 컨텍스트 압축 직전, load-bearing 컨텍스트(현재 diff·최근 테스트/에러 출력·활성
// 파일·현재 계획)를 보존하라는 handoff 안내와 미커밋 파일 목록을 주입한다(비차단).

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function changedFiles() {
  try {
    return execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.slice(3));
  } catch {
    return [];
  }
}

export function buildHandoff() {
  const files = changedFiles();
  const lines = [
    "PreCompact handoff — 압축으로 손실되면 안 되는 load-bearing 컨텍스트를 보존하세요:",
    "1) 현재 diff/미커밋 변경, 2) 최근 테스트·에러 출력, 3) 활성 파일, 4) 현재 계획(todo).",
    "과거 탐색 로그만 압축 대상입니다(C2).",
  ];
  if (files.length) {
    lines.push("미커밋 변경 파일:");
    lines.push(...files.slice(0, 30).map((f) => " - " + f));
  }
  return lines.join("\n");
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
  await readStdin();
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreCompact",
      additionalContext: buildHandoff(),
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
