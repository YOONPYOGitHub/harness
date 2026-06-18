# expense-cli

하네스 dogfood 검증용 **가계부(Expense) CLI**. TypeScript + vitest, ESM. 순수 도메인(`store`)과 I/O 어댑터(`persist`)·진입점(`cli`)을 분리한다.

## 구조

| 파일 | 역할 |
| --- | --- |
| [src/store.ts](src/store.ts) | `Ledger` 순수 도메인(add/list/balance/summary/remove/직렬화). I/O 없음 |
| [src/persist.ts](src/persist.ts) | JSON 파일 로드/저장 어댑터 |
| [src/cli.ts](src/cli.ts) | argv 파서·명령 디스패치. `run()` 내보냄, 직접 실행 가드 |
| [test/store.test.ts](test/store.test.ts) | 도메인 단위 테스트 10개 |

## 명령

```
cli add <income|expense> <amount> <category> [note]
cli list [income|expense|all]
cli summary [income|expense]
cli balance
cli rm <id>
cli help
```

데이터 파일은 환경변수 `LEDGER_DB`로 지정(기본 `ledger.json`).

## 실행

```bash
npm install
npm test                      # vitest run (10 tests)
LEDGER_DB=/tmp/l.json npm run cli -- add expense 1200 food 점심
```

## 검증 기록

세션 저널은 [HARNESS-SESSION-LOG.md](HARNESS-SESSION-LOG.md) 참고. 레포 루트 [scripts/smoke.mjs](../../scripts/smoke.mjs)가 이 앱을 자동 발견해 테스트한다.
