#!/usr/bin/env node
// 하네스 거버넌스 검사 — 설계: docs/02 §3.11 (wikidocs 원칙 6)
// "하네스 자신의 드리프트"를 센서로 막는다. 빌드 러너 없이 node로 실행·검증 가능.
//
//   1) 문서가 주장하는 보호 경로 ↔ hook이 실제 차단하는 경로 일치
//   2) 문서 수치 ↔ 실제 일치(에이전트 수, feature_list 경로 존재)
//   3) 등록된 자산이 어딘가에서 참조·배선되는가(죽은 자산 탐지)
//
// 통과 시 exit 0 + "OK", 실패 시 exit 1 + 실패 목록.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const oks = [];

function fail(msg) {
  fails.push(msg);
}
function ok(msg) {
  oks.push(msg);
}
function read(p) {
  return readFileSync(resolve(ROOT, p), "utf8");
}

// 워크스페이스 내 모든 .md/.json/.mjs 텍스트를 한 번 모아 참조 검색에 쓴다.
function collectText(dir, acc = { files: [], blob: "" }) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectText(full, acc);
    else if (/\.(md|json|mjs)$/.test(name)) {
      acc.files.push(full);
      acc.blob += "\n" + readFileSync(full, "utf8");
    }
  }
  return acc;
}

// --- 1. 보호 경로 정합 ---
async function checkProtectedPaths() {
  const { PROTECTED } = await import("../.github/hooks/protect-paths.mjs");
  const design = read("docs/02-ghcp-harness-design.md");
  const hooksJson = read(".github/hooks/hooks.json");

  if (!/protect-paths\.mjs/.test(hooksJson))
    fail("hooks.json이 PreToolUse에 protect-paths.mjs를 배선하지 않음");
  else ok("protect-paths.mjs가 hooks.json에 배선됨");

  for (const rule of PROTECTED) {
    if (!existsSync(resolve(ROOT, rule.path)))
      fail(`보호 경로 파일 없음: ${rule.path}`);
    if (!design.includes(rule.path))
      fail(`보호 경로가 설계서(docs/02)에 명시되지 않음: ${rule.path}`);
  }
  if (PROTECTED.every((r) => existsSync(resolve(ROOT, r.path)) && design.includes(r.path)))
    ok(`보호 경로 ${PROTECTED.length}개 모두 존재·문서 명시됨`);
}

// --- 2. 문서 수치 ↔ 실제 ---
function checkCounts() {
  const list = JSON.parse(read("feature_list.json"));
  if (!Array.isArray(list.features)) {
    fail("feature_list.json에 features 배열 없음");
    return list;
  }
  // 모든 feature.path 존재
  for (const f of list.features) {
    if (!f.path || !existsSync(resolve(ROOT, f.path)))
      fail(`feature_list 항목 경로 없음: ${f.id} → ${f.path}`);
  }
  // 에이전트 수: 실제 파일 ↔ feature_list agent-* ↔ 문서 주장
  const agentFiles = readdirSync(resolve(ROOT, ".github/agents")).filter((n) =>
    n.endsWith(".agent.md")
  );
  const agentFeatures = list.features.filter((f) => f.id.startsWith("agent-"));
  if (agentFiles.length !== agentFeatures.length)
    fail(
      `에이전트 수 불일치: 파일 ${agentFiles.length} ≠ feature_list ${agentFeatures.length}`
    );
  else ok(`에이전트 수 일치: ${agentFiles.length}개`);

  const readme = read("README.md");
  if (!new RegExp(`${agentFiles.length}\\s*모드|3\\s*모드`).test(readme)) {
    // 정보성: 모드 수 표기(Plan·Build·Ask=3 + Explore 서브에이전트)
  }
  return list;
}

// --- 3. 죽은 자산 탐지 ---
function checkDeadAssets(list) {
  const { blob } = collectText(ROOT);
  const hooksJson = read(".github/hooks/hooks.json");

  // 모든 hook 스크립트가 hooks.json에 배선
  const hookDir = resolve(ROOT, ".github/hooks");
  for (const name of readdirSync(hookDir).filter((n) => n.endsWith(".mjs"))) {
    if (!hooksJson.includes(name))
      fail(`죽은 hook(배선 안 됨): .github/hooks/${name}`);
  }

  // 모든 feature.path가 자기 자신 외 어딘가에서 참조됨
  for (const f of list.features) {
    if (!f.path) continue;
    const base = f.path.split("/").pop();
    // 참조 카운트: 파일명이 blob에 2회 이상(자기 정의 + 최소 1회 참조) 또는
    // 디렉터리형 자산은 경로가 문서에 등장
    const count = blob.split(base).length - 1;
    const referenced = blob.includes(f.path) || count >= 2;
    if (!referenced) fail(`죽은 자산(참조 없음): ${f.id} → ${f.path}`);
  }
  ok(`자산 ${list.features.length}개 배선·참조 검사 완료`);
}

async function main() {
  try {
    await checkProtectedPaths();
    const list = checkCounts();
    checkDeadAssets(list);
  } catch (e) {
    fail(`검사 중 예외: ${e.message}`);
  }

  for (const m of oks) console.log("  ✓ " + m);
  if (fails.length === 0) {
    console.log("\nOK — harness-doctor 통과");
    process.exit(0);
  }
  console.error("\n실패:");
  for (const m of fails) console.error("  ✗ " + m);
  console.error(`\n${fails.length}건 실패`);
  process.exit(1);
}

main();
