# 지아디자인폼

Next.js · React · TypeScript · Tailwind · react-konva · Zustand 기반 개인용 디자인 편집기입니다. 배포는 정적 사이트이며 OpenAI API 키 없이 이미지 레이어 분리를 사용할 수 있습니다.

## 실행

Node.js 22 이상과 pnpm 11을 권장합니다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

http://127.0.0.1:3000 에 접속합니다. `npm install`, `npm run dev`도 사용할 수 있습니다. 현재 Codex 환경에서는 `start.ps1`도 제공됩니다.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## 이미지에서 레이어 분리

1. 하단 **이미지 첨부하고 분리**에서 ChatGPT로 만든 PNG/JPG/WEBP를 선택합니다. 드롭·붙여넣기도 지원합니다. 캔버스의 기존 이미지도 선택 후 **이미지 레이어 분리**로 열 수 있습니다.
2. **한글·영문 글자 인식**을 실행하고 추출할 항목을 체크합니다. 오타, 색, 크기와 지울 영역의 좌표를 수정할 수 있습니다. 인식하지 못한 글자는 **글자 영역 직접 추가**를 사용합니다.
3. **피사체 자동 선택**을 실행합니다. 포함/제외 브러시로 경계를 수정하고 브러시 실행 취소(최근 5단계)를 사용할 수 있습니다. 자동 분석은 주요 피사체를 묶어 선택합니다. 여러 대상을 각각 분리하려면 불필요한 대상을 브러시로 제외하고, 보관된 원본을 복제하여 반복합니다.
4. 지워진 자리를 주변색·단색·투명 중 하나로 채웁니다. **결과 미리보기**에서 검토하고 **레이어로 적용**을 누릅니다.
5. 배경 이미지, 투명 피사체 이미지, 실제 텍스트 객체가 생깁니다. 원본은 숨김·잠금 상태로 남습니다. 전체 적용은 한 번의 Undo로 취소됩니다.
6. 텍스트는 더블클릭하거나 속성에서 수정합니다. 폰트·색상·위치·크기·회전·투명도와 그림자 농도/색/흐림/오프셋을 조절하고 PNG/JPG로 내보냅니다.

### 처리 범위

- 사진은 외부 AI 서비스로 전송하지 않습니다. Tesseract.js(한국어+영어)와 U²-NetP/ONNX Runtime Web이 브라우저에서 실행됩니다. 처리 도구는 이 사이트의 같은 출처에서 로드합니다.
- 파일 최대 20MB, 최대 4천만 화소. 분리용 이미지는 긴 변 최대 1600px로 축소합니다. 원본 레이어는 원래 데이터를 보관하며 캔버스 크기는 유지합니다.
- OCR 신뢰도가 높아도 오타가 있을 수 있습니다. 원래 글꼴은 식별하지 않으며 기본 글꼴로 재구성합니다. 기존 글자에 적용된 입체/그림자 효과를 원래 파라미터로 복구하지 않습니다.
- **주변색 채우기는 경계색 전파/평활화입니다. 생성형 배경 복원이 아닙니다.** 복잡한 무늬·사진·가려진 물체를 추론해서 복원하지 않으며 번짐이 생길 수 있습니다. 단색·투명 채우기를 선택하거나 추후 전문 인페인팅 모델 연결이 필요합니다.
- U²-NetP는 가벼운 주요 피사체 모델입니다. 가는 머리카락, 반투명 물체, 복잡한 배경에서 보정이 필요할 수 있습니다. 브러시는 선택을 직접 추가/제거합니다.
- ChatGPT에서 새 이미지를 생성하는 기능은 이 사이트에 연결되지 않았습니다. ChatGPT에서 생성한 파일을 가져와 편집합니다.

## 기존 편집 기능

빈 캔버스, 5종 프리셋/사용자 크기, 텍스트·이미지·도형·아이콘 추가, 마우스 이동·리사이즈·회전, 텍스트 직접 편집, 속성 패널, 레이어 숨김·잠금·복제·삭제·드래그 순서 변경, 최대 80단계 Undo/Redo, PNG/JPG Export, 독립 레이어 샘플 디자인을 제공합니다. Export는 선택 핸들을 제외합니다.

내 PC 글꼴은 Chrome/Edge의 Local Font Access 권한을 사용합니다. 산돌구름에서 활성화한 글꼴을 목록에서 선택하거나 TTF/OTF/WOFF/WOFF2 파일로 불러올 수 있습니다. 폰트는 업로드되지 않습니다.

단축키: Ctrl/Cmd+Z 취소, Ctrl/Cmd+Shift+Z 다시 실행, Ctrl/Cmd+D 복제, Delete 삭제, 방향키 이동. 숫자 속성은 Enter 또는 포커스를 옮기면 적용됩니다.

**자동 저장은 없습니다. 새로고침하면 작업과 불러온 글꼴이 초기화됩니다. 종료 전 이미지를 내보내세요.** 단일 페이지·단일 선택, 데스크톱 편집기이며 분리 대화상자는 좁은 화면에서도 스크롤로 사용할 수 있습니다.

## 주요 파일

- `components/editor/ImageSeparationDialog.tsx`: OCR 검토, 마스크 브러시, 미리보기, 원본 보관 및 결과 적용
- `lib/imageSeparation.ts`: OCR/분리 작업, 취소·시간제한, 이미지 처리, 문서 좌표 변환
- `public/image-tools/subject-worker.mjs`: U²-NetP를 이용한 피사체 선택
- `public/image-tools/repair.mjs`, `repair-worker.mjs`: 주변색 채우기
- `scripts/prepare-image-tools.mjs`: 동일 출처 배포용 모델·런타임·라이선스 준비
- `components/editor/`: 기존 Canvas/Toolbar/Layers/Properties/FontPicker
- `store/editorStore.ts`: DesignDocument/History
- `types/design.ts`: text/image/icon/shape 및 그림자 효과 속성
- `tests/separation*`: 배경 채우기와 회전·배율 좌표 회귀 검사

이전 API 연결 실험의 `server/generate.mjs`, `lib/generateDesign.ts`, `scripts/build-worker.mjs`는 현재 UI에서 사용하지 않습니다. 정적 배포에 포함되는 실행 서버가 아니며 실제 API 키도 저장되지 않았습니다.

## 배포 및 처리 자산

`pnpm build` 결과 `out/` 전체를 정적 호스팅에 올립니다. `.mjs`는 JavaScript, `.wasm`은 application/wasm MIME으로 제공해야 합니다. `.openai/hosting.json`은 기존 소유자 전용 Sites 설정을 유지합니다.

처리 자산은 `public/image-tools/`에 포함되어 있으므로 일반 빌드는 외부 모델 다운로드를 요구하지 않습니다. 라이브러리 업그레이드 또는 자산 재생성이 필요하면 `pnpm prepare:image-tools`를 실행합니다. U²-NetP는 rembg의 공개 체크섬을 검사합니다. 패키지 버전은 lockfile로 고정합니다.

- Tesseract.js 및 tessdata_fast: Apache-2.0
- U²-Net: Apache-2.0 (https://github.com/xuebinqin/U-2-Net)
- U²-NetP ONNX: rembg 공식 모델 배포 (https://github.com/danielgatis/rembg)
- ONNX Runtime: MIT
- 라이선스 원문: `public/image-tools/licenses/`

## 검증 및 다음 단계

상태/이력, 분리 결과 좌표 변환, 마스킹 배경 처리 등 15개 테스트와 TypeScript/프로덕션 빌드를 검증합니다. 한글·영문·가격이 있는 테스트 이미지로 실제 OCR, 피사체 모델 실행, 미리보기, 독립 레이어 적용과 Undo/Redo를 브라우저에서 확인했습니다. 사용자 실사진마다 분리 품질은 달라집니다.

다음 단계는 문서 저장/불러오기, 더 정교한 선택 모델, 선택한 부분의 생성형 배경 복원, 글꼴 추정입니다.
