import { describe, it, expect } from "vitest";
import { Ledger } from "../src/store.ts";

describe("Ledger.add", () => {
  it("수입과 지출을 증가 id로 기록한다", () => {
    const led = new Ledger();
    const a = led.add({ type: "income", amount: 3000, category: "salary" });
    const b = led.add({ type: "expense", amount: 1200, category: "food" });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(a.type).toBe("income");
    expect(b.category).toBe("food");
  });

  it("amount는 양수여야 한다", () => {
    const led = new Ledger();
    expect(() => led.add({ type: "expense", amount: 0, category: "x" })).toThrow(
      /amount/i,
    );
    expect(() =>
      led.add({ type: "expense", amount: -5, category: "x" }),
    ).toThrow(/amount/i);
  });

  it("category는 비어 있을 수 없다", () => {
    const led = new Ledger();
    expect(() =>
      led.add({ type: "income", amount: 10, category: "   " }),
    ).toThrow(/category/i);
  });

  it("type은 income 또는 expense만 허용한다", () => {
    const led = new Ledger();
    expect(() =>
      // @ts-expect-error 잘못된 type 런타임 검증
      led.add({ type: "bogus", amount: 10, category: "x" }),
    ).toThrow(/type/i);
  });
});

describe("Ledger.balance", () => {
  it("수입 합 - 지출 합", () => {
    const led = new Ledger();
    led.add({ type: "income", amount: 5000, category: "salary" });
    led.add({ type: "expense", amount: 1200, category: "food" });
    led.add({ type: "expense", amount: 800, category: "transport" });
    expect(led.balance()).toBe(3000);
  });

  it("빈 장부의 잔액은 0", () => {
    expect(new Ledger().balance()).toBe(0);
  });
});

describe("Ledger.summary", () => {
  it("카테고리별 합계를 집계한다(지출 기준)", () => {
    const led = new Ledger();
    led.add({ type: "expense", amount: 1000, category: "food" });
    led.add({ type: "expense", amount: 500, category: "food" });
    led.add({ type: "expense", amount: 800, category: "transport" });
    led.add({ type: "income", amount: 9000, category: "salary" });
    const sum = led.summary("expense");
    expect(sum).toEqual([
      { category: "food", total: 1500 },
      { category: "transport", total: 800 },
    ]);
  });

  it("합계 내림차순으로 정렬한다", () => {
    const led = new Ledger();
    led.add({ type: "expense", amount: 100, category: "a" });
    led.add({ type: "expense", amount: 900, category: "b" });
    expect(led.summary("expense").map((s) => s.category)).toEqual(["b", "a"]);
  });
});

describe("Ledger.list", () => {
  it("type 필터로 분리한다", () => {
    const led = new Ledger();
    led.add({ type: "income", amount: 100, category: "x" });
    led.add({ type: "expense", amount: 50, category: "y" });
    expect(led.list("income")).toHaveLength(1);
    expect(led.list("expense")).toHaveLength(1);
    expect(led.list("all")).toHaveLength(2);
  });
});

describe("직렬화 라운드트립", () => {
  it("toJSON -> fromJSON으로 상태와 id 시퀀스가 보존된다", () => {
    const led = new Ledger();
    led.add({ type: "income", amount: 100, category: "x" });
    led.add({ type: "expense", amount: 40, category: "y" });
    const restored = Ledger.fromJSON(led.toJSON());
    expect(restored.list("all")).toEqual(led.list("all"));
    expect(restored.add({ type: "income", amount: 1, category: "z" }).id).toBe(3);
  });
});
