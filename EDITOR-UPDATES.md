# 편집기 업데이트

## 구현
- 우측 다크 패널: 위치·정렬·비율 잠금, 외형, 객체별 텍스트/이미지 속성, 여러 채우기·외곽선·효과, 선택 객체 내보내기.
- 캔버스 제스처는 임시 preview로 속성 패널에 실시간 표시하고, 종료 시 한 번만 history에 기록한다.
- 기존 단일 스타일 필드는 layerStyles 어댑터로 읽는다. 새 fills/strokes/effects 배열은 문서에 저장되며 Undo와 복제에 포함된다. 텍스트 내용은 TextLayer로 유지된다.
- 그림자·내부 그림자·레이어 블러·외부 광선 및 외곽선의 안/중앙/바깥 위치를 알파 마스크로 렌더링한다.
- 이미지 툴바: 원본 보존 자르기, 기존 다각형 선택, 브라우저 U2Net 배경 제거, 기존 OpenAI 서버를 통한 전체/선택 영역 프롬프트 편집, 독립 더 보기 메뉴.
- Crop은 원본 픽셀에 대한 정규화된 사각형 메타데이터다. 기존 prepareImage가 Crop과 반전을 적용한 원본 해상도를 마스크 도구로 전달한다. 편집 결과는 동일 레이어 교체 + 숨긴 원본 보관 + Undo 한 단계로 적용된다.
- 선택 객체 PNG/JPG 1/2/3배 내보내기. JPG는 투명 부분을 흰 배경으로 저장한다. SVG는 효과 없는 도형·아이콘(지원 가능한 외곽선)에 한해 활성화한다.

## 주요 파일
- 변경: CanvasEditor, Editor, PropertiesPanel, LayerNodes, ImageSeparationDialog, editorStore, design types, imageSeparation, inpaintSelection, applyImageResult, exportDesign, designExchange, globals.css.
- 추가: properties/의 8개 섹션·공통 입력, ImageContextToolbar, ImageMoreMenu, CropDialog, ImageEditDialog, StyledLayer.
- 추가 서비스: imageEditing, layerStyles, renderLayerStyle, exportSelection. 테스트: tests/inspector.test.ts.

## 연결과 제한
- 프롬프트/자리 채우기는 기존 서버의 OPENAI_API_KEY를 재사용한다. 브라우저에 키를 저장하지 않는다. 배경 제거는 별도 API 설정 없이 동봉 모델을 사용한다.
- 기존 객체 모델은 text/image/shape/icon이다. 중첩 프레임·오토레이아웃은 추가하지 않았다.
- 복잡한 배경·가는 머리카락은 자동 배경 제거의 경계 품질에 한계가 있다.
- 효과 미리보기 비트맵은 긴 변 4096px로 제한한다. 2x/3x 출력 크기는 보장하지만 복잡한 효과는 해당 비트맵에서 확대된다. 원본 문서의 텍스트·도형 데이터는 보존한다.
- 기존 Figma 브리지는 그대로 유지했다. 새 복수 스타일의 Figma 네이티브 매핑은 별도 확장 대상이다. JSON 문서 교환은 새 스타일과 Crop을 유지하고 검증한다.

## 검증
- TypeScript와 프로덕션 빌드 통과.
- 자동 테스트 36개: 기존 편집/잠금/복제/히스토리/API 검사 및 새 Crop 좌표·반전·회전·스타일 검증·제스처 히스토리.
- 브라우저에서 스타일 적용 객체 드래그/리사이즈, 속성 동기화, Undo, 이미지 업로드, Crop 핸들 및 적용, 실제 브라우저 배경 제거와 Undo 확인.
- 실제 OpenAI 마스크 편집으로 Crop된 이미지의 선택 글자를 제거하고 원래 배경 복원 및 결과 탭/레이어 적용 확인. 실패 시에도 UI와 서버 로그에 오류가 표시됨을 확인.
