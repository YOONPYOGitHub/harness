# 변경 이력 (CHANGELOG)

이 문서는 저장소의 주요 변경과 **이력 복구 앵커**를 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/)를 느슨히 따른다.

## 복구 앵커 (Recovery anchors)

프로덕트화 과정에서 정리·이동된 파일은 아래 git 앵커에서 **그대로 복구**할 수 있다.

| 앵커(tag/commit) | 시점 | 내용 |
| --- | --- | --- |
| `snapshot/pre-productization` | 프로덕트화 직전 | 리서치·설계·dogfood 자산을 포함한 전체 상태 스냅샷 |

복구 예시:

```bash
# 특정 파일을 스냅샷 시점 그대로 되살리기
git checkout snapshot/pre-productization -- <경로>

# 스냅샷 전체를 확인
git show snapshot/pre-productization
```

## [Unreleased] — 프로덕트화

### Added

- `LICENSE` — MIT 라이선스(클론·재사용 허용).
- `.gitignore` — `node_modules` 등 빌드 산출물 제외.
- `README` Quick Start — 다른 사용자가 git clone 후 바로 적용하는 절차.
- `.github/workflows/harness-ci.yml` — push·PR마다 harness-doctor·hook 단위 테스트·스모크를 원격 강제.
- `tests/hooks.test.mjs` — hook 순수 로직 단위 테스트(보호 경로 평가·문서 링크 검사, 9 케이스).

### Changed

- `.github/hooks/protect-paths.mjs` — 디렉터리 prefix 매칭 추가, `.github/hooks/` 전체를 `ask` 보호.
- `docs/02-ghcp-harness-design.md`·`README.md` — CI·prefix 보호 정합 갱신.

### Removed

- `sandbox/HARNESS-TEST-QA-LOG.md` — 내부 QA 스크래치 로그(외부 참조 0건). 이력은 `snapshot/pre-productization`에서 복구 가능.

## 이전 이력

프로덕트화 이전의 상세 변천(조사 → 설계 → 구현 → dogfood)은 git 로그와 [docs/05-decision-log.md](docs/05-decision-log.md)에 기록되어 있다.
