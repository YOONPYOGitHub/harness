---
description: "TypeScript/JavaScript 코드를 작성·수정할 때의 규칙. 타입 안전성, 모듈 경계, 에러 처리 컨벤션."
applyTo: "**/*.{ts,tsx,js,jsx,mts,cts}"
---
# TypeScript / JavaScript 규칙

- `any`를 피하고 명시적 타입을 쓴다. 불가피하면 `unknown` + 좁히기.
- 시스템 경계(입력·외부 API·파일)에서만 검증한다. 일어날 수 없는 상황에 대한 방어 코드는 추가하지 않는다.
- 새 코드의 공개 함수에는 의미 있는 이름과 좁은 시그니처를 쓴다. 내가 건드리지 않은 코드에 주석·타입·docstring을 덧붙이지 않는다.
- 부수효과는 모듈 경계 밖으로 드러내지 않는다(가져오기만으로 실행되는 코드 금지).
- 비동기는 `async/await`로 일관되게. 떠다니는 promise(미처리)를 남기지 않는다.
