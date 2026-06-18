import { pathToFileURL } from "node:url";
import { loadLedger, saveLedger } from "./persist.ts";
import type { EntryType, ListFilter } from "./store.ts";

const HELP = `expense-cli — 가계부 CLI (하네스 dogfood)

사용법:
  cli add <income|expense> <amount> <category> [note]   항목 추가
  cli list [income|expense|all]                         항목 목록 (기본 all)
  cli summary [income|expense]                          카테고리별 합계 (기본 expense)
  cli balance                                           잔액(수입-지출)
  cli rm <id>                                           항목 삭제
  cli help                                              도움말

데이터 파일은 환경변수 LEDGER_DB로 지정(기본 ledger.json).`;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function run(argv: string[], dbPath: string): string {
  const [cmd, ...rest] = argv;

  switch (cmd) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return HELP;

    case "add": {
      const [type, amountRaw, category, ...noteParts] = rest;
      if (type !== "income" && type !== "expense") {
        throw new Error("type은 income 또는 expense여야 합니다");
      }
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount)) {
        throw new Error(`amount가 숫자가 아닙니다: ${String(amountRaw)}`);
      }
      if (!category) throw new Error("category가 필요합니다");
      const note = noteParts.join(" ").trim() || undefined;
      const ledger = loadLedger(dbPath);
      const entry = ledger.add({
        type: type as EntryType,
        amount,
        category,
        note,
      });
      saveLedger(dbPath, ledger);
      return `추가됨 #${entry.id}: ${entry.type} ${fmt(entry.amount)} [${entry.category}]${entry.note ? ` ${entry.note}` : ""}`;
    }

    case "list": {
      const filter = (rest[0] ?? "all") as ListFilter;
      if (!["income", "expense", "all"].includes(filter)) {
        throw new Error(`알 수 없는 필터: ${filter}`);
      }
      const entries = loadLedger(dbPath).list(filter);
      if (entries.length === 0) return "(항목 없음)";
      return entries
        .map(
          (e) =>
            `#${e.id} ${e.type === "income" ? "+" : "-"}${fmt(e.amount)} [${e.category}]${e.note ? ` ${e.note}` : ""}`,
        )
        .join("\n");
    }

    case "summary": {
      const type = (rest[0] ?? "expense") as EntryType;
      if (type !== "income" && type !== "expense") {
        throw new Error("summary 대상은 income 또는 expense입니다");
      }
      const rows = loadLedger(dbPath).summary(type);
      if (rows.length === 0) return "(항목 없음)";
      return rows.map((r) => `${r.category}: ${fmt(r.total)}`).join("\n");
    }

    case "balance":
      return `잔액: ${fmt(loadLedger(dbPath).balance())}`;

    case "rm": {
      const id = Number(rest[0]);
      if (!Number.isInteger(id)) {
        throw new Error(`id가 정수가 아닙니다: ${String(rest[0])}`);
      }
      const ledger = loadLedger(dbPath);
      const removed = ledger.remove(id);
      saveLedger(dbPath, ledger);
      return `삭제됨 #${removed.id}: ${removed.type} ${fmt(removed.amount)} [${removed.category}]`;
    }

    default:
      throw new Error(`알 수 없는 명령: ${cmd} (help 참고)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dbPath = process.env.LEDGER_DB ?? "ledger.json";
  try {
    console.log(run(process.argv.slice(2), dbPath));
  } catch (err) {
    console.error(`오류: ${(err as Error).message}`);
    process.exit(1);
  }
}
