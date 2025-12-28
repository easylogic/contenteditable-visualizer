# 배포 가이드

## npm 배포 방법 (Changesets 사용)

이 프로젝트는 [Changesets](https://github.com/changesets/changesets)를 사용하여 버전 관리와 배포를 자동화합니다.

### Changesets란?

Changesets는 모노레포에서 버전 관리와 changelog 생성을 자동화하는 도구입니다:
- 변경사항을 changeset 파일로 기록
- 버전 업데이트 자동화
- Changelog 자동 생성
- GitHub Release 자동 생성

### 배포 워크플로우

1. **변경사항 기록 (Changeset 생성)**
   ```bash
   pnpm changeset
   ```
   - 변경사항을 설명하는 changeset 파일 생성
   - 버전 타입 선택 (patch, minor, major)
   - 변경사항 설명 입력

2. **Changeset 커밋 및 PR 생성**
   ```bash
   git add .changeset
   git commit -m "chore: add changeset"
   git push
   ```
   - PR을 생성하고 머지

3. **자동 배포**
   - PR이 main 브랜치에 머지되면 자동으로:
     - 버전 업데이트 (package.json)
     - Changelog 생성
     - npm 배포
     - GitHub Release 생성

### Changeset 파일 예시

`.changeset/` 폴더에 생성되는 파일 예시:

```markdown
---
"contenteditable-visualizer": patch
---

Fix contenteditable=false element visualization
```

### 수동 배포 (로컬)

```bash
# 1. Changeset 생성
pnpm changeset

# 2. 버전 업데이트
pnpm version-packages

# 3. 빌드 및 배포
pnpm release
```

## 필수 설정

### npm Access Token 생성

1. **npm 로그인**
   - https://www.npmjs.com 에서 로그인

2. **Access Token 생성**
   - 프로필 아이콘 클릭 → "Access Tokens"
   - "Generate New Token" → "Automation" 선택
   - Token 이름 입력 후 생성
   - 생성된 Token 복사 (한 번만 표시됨)

3. **GitHub Secrets에 추가**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - "New repository secret" 클릭
   - Name: `NPM_TOKEN`
   - Value: 복사한 npm token
   - "Add secret" 클릭

## 버전 관리

- **Semantic Versioning** 사용
  - `MAJOR.MINOR.PATCH` 형식 (예: `1.2.3`)
  - `MAJOR`: 호환되지 않는 API 변경
  - `MINOR`: 하위 호환되는 기능 추가
  - `PATCH`: 하위 호환되는 버그 수정

## 배포 확인

배포가 완료되면:
- npm 패키지 페이지: https://www.npmjs.com/package/contenteditable-visualizer
- 설치 테스트: `pnpm add contenteditable-visualizer@latest`
