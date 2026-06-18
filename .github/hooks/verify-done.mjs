// Stop 검증 게이트 — 설계: docs/02 §3.9 규칙 2, C8 강제
// "검증 없는 완료"를 차단한다. 두 가지를 검사한다.
//  (1) 정규 상태 소스(feature_list.json)가 수정됐는데 커밋되지 않았으면
//      종료를 막아 /finish(검증→커밋)를 강제한다.
//  (2) 하네스 자산(.github/·scripts/·docs/·feature_list.json·README.md)이
//      미커밋 상태면 harness-doctor를 돌려 거버넌스 드리프트를 차단한다.
//      근거: 수동 점검 의존을 로컬 CI 등가물로 기계화(docs/06 §4, 원칙 6).
//
// 범위 한정: harness-doctor는 하네스 자산이 변경됐을 때만 돌려 과발화를 막는다.
// 무한 루프 방지: Stop hook이 차단하면 재진입할 수 있으므로 stop_hook_active를
// 확인해 재진입 시 통과시킨다. 차단 조건이 "미커밋/드리프트"이므로 올바른
// 행동(커밋/드리프트 수정)을 하면 저절로 풀린다.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const WATCHED = "feature_list.json";
const ASSET_PATHS = [
  ".github",
  "scripts",
  "docs",
  "feature_list.json",
  "README.md",
];

export function uncommittedStatusChange() {
  try {
    const out = execFileSync("git", ["status", "--porcelain", "--", WATCHED], {
      encoding: "utf8",
    }).trim();
    return out.length > 0;
  } catch {
    return false; // git 미사용/오류 시 차단하지 않음
  }
}

export function harnessAssetsChanged() {
  try {
    const out = execFileSync(
      "git",
      ["status", "--porcelain", "--", ...ASSET_PATHS],
      { encoding: "utf8" }
    ).trim();
    return out.length > 0;
  } catch {
    return false; // git 미사용/오류 시 차단하지 않음
  }
}

// harness-doctor 실행. exit 0이면 ok, exit≠1이면 드리프트.
// 스포운 실패(node 미설치 등)는 차단하지 않는다(거짓 차단 방지).
export function runHarnessDoctor() {
  try {
    const out = execFileSync("node", ["scripts/harness-doctor.mjs"], {
      encoding: "utf8",
    });
    return { ok: true, output: out };
  } catch (e) {
    if (e && typeof e.status === "number") {
      return { ok: false, output: `${e.stdout || ""}${e.stderr || ""}`.trim() };
    }
    return { ok: true, output: "" };
  }
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

  // 재진입(이미 한 번 차단해 Stop hook이 활성)이면 통과시켜 무한 루프 방지
  if (event.stop_hook_active === true) process.exit(0);

  // (2) 하네스 자산이 변경됐으면 거버넌스 드리프트 검사
  if (harnessAssetsChanged()) {
    const doctor = runHarnessDoctor();
    if (!doctor.ok) {
      const tail = doctor.output.split("\n").slice(-12).join("\n");
      const output = {
        decision: "block",
        reason:
          "harness-doctor가 거버넌스 드리프트를 보고했습니다(문서↔구현 불일치). 드리프트를 해소한 뒤 종료하세요(docs/06 §4). \n--- harness-doctor 출력 ---\n" +
          tail,
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    }
  }

  // (1) 정규 상태 소스 미커밋 검사
  if (!uncommittedStatusChange()) process.exit(0);

  const output = {
    decision: "block",
    reason:
      "feature_list.json에 미커밋 변경이 있습니다. 상태 변경은 /finish로 검증→갱신→커밋을 마친 뒤 종료하세요(docs/02 §3.10). 실제 검증 명령 출력을 인용해 통과시키세요(self-eval 회피).",
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
