export type EntryType = "income" | "expense";

export interface Entry {
  id: number;
  type: EntryType;
  amount: number;
  category: string;
  note?: string;
}

export interface NewEntry {
  type: EntryType;
  amount: number;
  category: string;
  note?: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export type ListFilter = EntryType | "all";

interface LedgerState {
  entries: Entry[];
  nextId: number;
}

export class Ledger {
  #entries: Entry[] = [];
  #nextId = 1;

  add(input: NewEntry): Entry {
    if (input.type !== "income" && input.type !== "expense") {
      throw new Error(`잘못된 type: ${String(input.type)} (income|expense)`);
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error(`amount는 양수여야 합니다: ${String(input.amount)}`);
    }
    const category = input.category.trim();
    if (category === "") {
      throw new Error("category는 비어 있을 수 없습니다");
    }
    const entry: Entry = {
      id: this.#nextId++,
      type: input.type,
      amount: input.amount,
      category,
    };
    const note = input.note?.trim();
    if (note) entry.note = note;
    this.#entries.push(entry);
    return entry;
  }

  list(filter: ListFilter = "all"): Entry[] {
    if (filter === "all") return this.#entries.map((e) => ({ ...e }));
    return this.#entries.filter((e) => e.type === filter).map((e) => ({ ...e }));
  }

  balance(): number {
    return this.#entries.reduce(
      (acc, e) => acc + (e.type === "income" ? e.amount : -e.amount),
      0,
    );
  }

  summary(type: EntryType): CategoryTotal[] {
    const totals = new Map<string, number>();
    for (const e of this.#entries) {
      if (e.type !== type) continue;
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    return [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  }

  remove(id: number): Entry {
    const idx = this.#entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`id ${id} 항목을 찾을 수 없습니다`);
    return this.#entries.splice(idx, 1)[0]!;
  }

  toJSON(): LedgerState {
    return {
      entries: this.#entries.map((e) => ({ ...e })),
      nextId: this.#nextId,
    };
  }

  static fromJSON(state: LedgerState): Ledger {
    const led = new Ledger();
    led.#entries = (state.entries ?? []).map((e) => ({ ...e }));
    led.#nextId =
      state.nextId ??
      led.#entries.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    return led;
  }
}
