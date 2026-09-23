# 지아디자인폼 · Phase 1

Next.js / React / TypeScript / Tailwind CSS / react-konva / Zustand 기반 개인용 레이어 디자인 에디터입니다.

## 실행

Node.js 20.9 이상에서 프로젝트 폴더를 열고 실행합니다.

```sh
npm install
npm run dev
```

http://127.0.0.1:3000 에 접속합니다. pnpm 사용자라면 `pnpm install --frozen-lockfile`, `pnpm dev`를 사용할 수 있습니다.
현재 Codex 환경처럼 Node만 제공되는 경우 `powershell -ExecutionPolicy Bypass -File ./start.ps1`로 실행할 수 있습니다.

```sh
npm run typecheck
npm test
npm run build
npm start
```

## 구현 기능

- 빈 캔버스, 5종 크기 프리셋 및 100–4096 px 사용자 크기
- 텍스트, 업로드 이미지(PNG/JPG/JPEG/WEBP, 20MB 이하), 사각형/둥근 사각형/원, 벡터 아이콘
- 클릭 선택, 마우스 이동/크기 조절/회전, 확대/축소, 선택 핸들
- 텍스트 더블클릭 편집: Ctrl+Enter 또는 바깥 클릭으로 적용, Esc 취소
- 공통 및 유형별 속성, 이미지 비율 유지와 좌우/상하 반전
- 레이어 선택/숨김/잠금/복제/삭제, 앞뒤 순서 변경 및 목록 드래그 정렬
- 최대 80단계 Undo/Redo. 드래그와 변형은 제스처 종료 시 한 단계로 기록
- 원본 캔버스 크기의 PNG/JPG 내보내기. 별도 렌더 복사본에서 선택 UI 제거
- Generate로 13개 독립 레이어의 샘플 SNS 디자인 생성. 기존 디자인 교체는 Undo 가능

텍스트는 JSON의 text 객체로 유지되며 최종 PNG/JPG 내보내기 시에만 이미지로 렌더됩니다. 인물 자리에는 명시적인 샘플 이미지 플레이스홀더를 사용합니다.

## 사용 안내

1. Text 또는 텍스트 추가로 텍스트를 만듭니다.
2. Image/이미지 업로드에서 로컬 이미지를 선택합니다. 파일은 외부 서버에 전송하지 않습니다.
3. 도형 및 Icon 메뉴에서 필요한 요소를 추가합니다.
4. 캔버스 또는 Layers에서 선택한 뒤 마우스와 오른쪽 속성 패널로 편집합니다.
5. 숫자/텍스트 속성 입력은 포커스를 옮기면 적용됩니다. 숫자는 Enter로도 적용합니다.
6. Export에서 PNG 또는 JPG를 선택합니다.

단축키: Ctrl/Cmd+Z 취소, Ctrl/Cmd+Shift+Z 또는 Ctrl+Y 다시 실행, Ctrl/Cmd+D 복제, Delete 삭제, 방향키 1px 이동, Shift+방향키 10px 이동. 입력란 편집 중에는 객체 단축키를 적용하지 않습니다.

## 주요 파일

```text
app/                         Next.js 진입점 및 전역 스타일
components/editor/
  Editor.tsx                 화면 구성, 업로드, 키보드 동작
  EditorToolbar.tsx          프로젝트 이름, Undo/Redo, Export
  CanvasEditor.tsx           Konva Stage, 선택/변형 및 텍스트 직접 편집
  LayerNodes.tsx             텍스트/이미지/도형/벡터 아이콘 렌더러
  LayerPanel.tsx             레이어 목록과 순서/상태 관리
  PropertiesPanel.tsx        타입별 속성
  CanvasSizeSelector.tsx     크기 프리셋 및 사용자 입력
  PromptBar.tsx              Mock Generate
store/editorStore.ts         DesignDocument 및 변경 명령
types/design.ts              공통 속성과 타입별 discriminated union
lib/designParser.ts          문서/레이어 팩토리 및 Mock JSON 생성
lib/history.ts               이력 한도와 zIndex 정규화
lib/exportDesign.ts          화면 배율과 독립적인 이미지 내보내기
tests/editor.test.ts         문서 변경/이력/잠금/순서 회귀 테스트
```

`document.layers` 배열 순서가 렌더링 순서이며 커밋마다 zIndex를 정규화합니다. 선택 상태와 History는 DesignDocument 밖에 둡니다. 변경은 저장소 명령으로 통과시켜 향후 AI 수정도 동일한 Undo/Redo 흐름에 연결할 수 있습니다. 잠긴 레이어는 위치/스타일/삭제/복제/순서 변경을 거부하며 표시와 잠금 해제만 허용합니다.

## 범위와 다음 단계

이 단계는 데스크톱(가로 1024px 이상)용이며, 단일 선택·단일 페이지 편집입니다. 자동 저장이나 문서 파일 저장은 아직 없으므로 새로고침하면 편집 내용이 초기화됩니다. 종료 전 결과 이미지를 내보내세요.

실제 AI, 로그인, 클라우드 저장, 배경 제거, 인물 생성, Figma 연동, 템플릿/에셋 라이브러리, 다중 페이지, 자동 리사이즈는 구현하지 않았습니다. 프롬프트 내용에 따른 생성도 아직 없으며 Generate는 정해진 샘플만 만듭니다.

다음 Phase에서는 JSON 스키마 검증과 문서 저장/불러오기, AI 변경 명령(`updateLayer`, `addLayer`, `removeLayer`) 및 적용 전 검증을 추가합니다. 그다음 이미지/인물 생성 결과를 독립 image layer로 연결합니다.

## 검증

프로덕션 빌드 및 TypeScript 검사, 핵심 상태 회귀 테스트 5개를 통과했습니다. 실제 브라우저에서 텍스트 추가/편집, 이동/크기 조절/회전, Undo/Redo, 샘플 생성, 이미지 업로드/비율 유지/잠금, 숨김/복제/삭제, 도형 속성, 크기 프리셋, PNG/JPG 내보내기 동작을 검증했습니다.


## 배포

이 프로젝트는 정적 사이트로 배포할 수 있습니다. API 키나 별도의 애플리케이션 서버는 필요하지 않습니다.

1. `pnpm install --frozen-lockfile`로 의존성을 설치합니다.
2. `pnpm build`로 `out/` 폴더를 만듭니다.
3. 정적 호스팅 서비스에 `out/` 폴더의 **내용 전체**를 업로드합니다. `index.html`과 `_next/`를 함께 배포해야 합니다.
4. 로컬 배포 확인은 `pnpm start`로 실행합니다. 포트 변경은 `PORT` 환경 변수를 사용합니다.

Cloudflare Pages 등에서는 빌드 명령을 `pnpm build`, 출력 디렉터리를 `out`으로 설정합니다. 사이트는 도메인 루트(`/`)에 배포하는 설정입니다. 하위 경로에 배포하려면 Next.js `basePath` 설정 후 다시 빌드해야 합니다.

외부 호스팅에도 업로드 이미지와 디자인은 브라우저 메모리에서만 처리됩니다. 자동 저장/로그인/실제 AI 기능은 여전히 포함하지 않습니다. Sites 배포는 소유자 전용 비공개로 시작합니다.
