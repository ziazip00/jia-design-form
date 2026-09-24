# 컬러 팔레트 변경 내역

- components/editor/ColorPalette.tsx: 프롬프트 하단 팔레트, 가로 탐색, Hover Preview, 클릭 적용, 컬러피커/HEX, 원본 복원.
- lib/paletteColors.ts: 주요 색상 군집 추출, 추천 조합, 색상별 재배색, 명도 대비 보정.
- lib/paletteDocument.ts: 레이어 색상만 매핑, 원본 색상 기록, 텍스트 대비 검사. 위치·내용·폰트·불투명도·레이어 순서는 유지.
- lib/paletteImage.ts: 로컬 이미지 분석과 재배색 캐시. 이미지 원본 src는 변경하지 않음.
- store/editorStore.ts, types/design.ts: 원본 색상, 이미지 팔레트 메타데이터, 기록에 남지 않는 미리보기 상태.
- components/editor/CanvasEditor.tsx, PropertiesPanel.tsx: 팔레트 미리보기 반영.
- components/editor/AIComposer.tsx: 팔레트 배치, 생성 결과 자동 캔버스 배치, 편집 참조에 현재 재배색 반영.
- lib/layerStyles.ts, renderLayerStyle.ts: 이미지 색상 군집별 렌더링. 캔버스 및 PNG/JPG 내보내기 반영.
- lib/imageSeparation.ts, applyImageResult.ts: 재배색된 이미지로 후속 편집, 결과에 중복 색상 적용 방지.
- lib/designExchange.ts: 팔레트 입력 검증, 외부 교환 시 이미지의 현재 색상 반영.
- app/globals.css: 기존 UI에 맞춘 팔레트 스타일.
- tests/palette.test.ts: 원본 복원, 레이어 보존, 대비, 미리보기/실행취소, 투명도/질감 유지, 잘못된 입력 검증.

## 검증
43개 테스트 통과, Next.js 프로덕션 빌드 및 TypeScript 통과. 로컬 브라우저에서 샘플 디자인 이미지 분석, 팔레트 적용, 개별 HEX 수정, 원본 복원, Undo/Redo 및 오류 로그 확인.

## 범위와 제한
편집 가능한 텍스트/도형/아이콘은 기존 색상 속성만 바꾼다. PNG/JPG는 의미별 배경·인물·문자를 분리하지 않고 색상 군집을 독립적으로 재배색한다. 따라서 사진 피부색과 이미지 속 문자는 육안 확인이 필요하다. 잠긴 레이어 및 숨긴 원본은 유지한다. 텍스트 대비는 배경 표본을 기준으로 보정하며 복잡한 배경이나 낮은 불투명도에서는 안내를 표시한다.

빠른 이미지 미리보기는 긴 변 2048px를 기준으로 캐시한다. 캔버스 이미지 내보내기도 이 렌더링을 사용한다. 원본 파일은 그대로 유지하며 원본 색상 버튼으로 복원한다. 원본 색상 기록은 현재 편집 세션 기준이며 JSON으로 내보낸 뒤 다시 가져오면 가져온 색상이 새 원본 기준이다. API 추가 연결이나 별도 비용 없이 브라우저에서 처리한다.
