// SessionStart · UserPromptSubmit 컨텍스트 주입 — 설계: docs/02 §3.9
// 세션 시작/프롬프트 제출 시 feature_list.json의 진행 중·미착수 항목 요약을
// additionalContext로 주입한다(비차단). load-bearing 컨텍스트는 건드리지 않는다.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function summarize() {
  let list;
  try {
    list = JSON.parse(readFileSync(resolve(process.cwd(), "feature_list.json"), "utf8"));
  } catch {
    return null;
  }
  const features = Array.isArray(list.features) ? list.features : [];
  const active = features.filter((f) => f.status === "in-progress");
  const todo = features.filter((f) => f.status === "not-started");
  const done = features.filter((f) => f.status === "done");

  const lines = [
    `하네스 상태(feature_list.json): done ${done.length} · in-progress ${active.length} · not-started ${todo.length}`,
  ];
  if (active.length)
    lines.push("진행 중: " + active.map((f) => f.id).join(", "));
  if (todo.length)
    lines.push("다음 후보: " + todo.slice(0, 5).map((f) => f.id).join(", "));
  lines.push("상태 변경은 /finish 단일 경로로만(직접 status 편집 금지).");
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
  const raw = await readStdin();
  let event = {};
  try {
    event = raw ? JSON.parse(raw) : {};
  } catch {
    event = {};
  }

  const ctx = summarize();
  if (!ctx) process.exit(0);

  const output = {
    hookSpecificOutput: {
      hookEventName: event.hook_event_name || "SessionStart",
      additionalContext: ctx,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
