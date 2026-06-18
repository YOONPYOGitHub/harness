import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Ledger } from "./store.ts";

export function loadLedger(path: string): Ledger {
  if (!existsSync(path)) return new Ledger();
  const raw = readFileSync(path, "utf8").trim();
  if (raw === "") return new Ledger();
  return Ledger.fromJSON(JSON.parse(raw));
}

export function saveLedger(path: string, ledger: Ledger): void {
  writeFileSync(path, JSON.stringify(ledger.toJSON(), null, 2) + "\n", "utf8");
}
