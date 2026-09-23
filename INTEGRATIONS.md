# 이미지 편집 및 외부 디자인 교환

- 업로드: 원본 비율을 유지하며 캔버스 중앙에 배치. 큰 이미지만 축소.
- 글자 추출: 로컬 Tesseract OCR → 내용 검토 → 결과 미리보기 → 실제 텍스트 레이어 적용.
- 글자 모두 제거: 기존 서버 `/api/images`로 OpenAI 이미지 편집 호출. API 비용 발생. 배경 복원 결과를 확인하고 적용해야 함. 원본 레이어 보관. AI가 세부 이미지를 변경하거나 글자를 남길 수 있음.
- 직접 오려내기: 포함/제외 브러시, 크기, 실행 취소, 투명 미리보기, 독립 PNG 피사체 레이어.

## Figma 파일 교환 (MCP 연결과 별개)
`public/figma-bridge.zip` 압축 해제 후 Figma 데스크톱의 Plugins → Development → Import plugin from manifest로 설치.
앱 MCP 연결 메뉴에서 JSON 저장 → 플러그인에서 가져오기. Figma 프레임 선택 → 플러그인의 JSON 저장 → 앱에서 가져오기.
텍스트/기본 도형은 지원 범위에서 편집 가능. 이미지 및 복합 벡터·효과는 각 이미지 레이어로 변환. 글꼴 누락은 대체됨. 완전한 Figma 기능/효과 호환이나 실시간 동기화가 아님.
실제 Figma 계정에서 플러그인을 실행하는 최종 검증은 필요함.

## MCP 연결: 미구현 인증 경계
현재는 연결 안내와 미연결 상태만 제공. 가짜 연결 상태, 토큰 입력창, 연결 해제 동작을 만들지 않음.
공식 서버: https://mcp.figma.com/mcp
공식 문서: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
도구 범위: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/

다음 단계: 이 웹앱용으로 지원되는 OAuth 클라이언트 등록/승인 가능 여부 확인, HTTPS 콜백 URL 등록, 서버의 암호화 토큰 저장소, 세션별 인증·갱신·연결 해제 구현 후 MCP initialize/tools/list 및 실제 도구 호출 검증. 브라우저나 JSON에 토큰을 넣지 않음. Codex 연결을 웹앱 인증으로 재사용하지 않음.
Figma는 use_figma 및 자산 업로드/다운로드로 편집 레이어 읽기·쓰기를 지원. Weave는 게시한 워크플로 검색/입력조회/실행/결과조회에 대응하며 범용 레이어 왕복 API가 아님. 실행에는 별도 Weave 계정/크레딧과 실행 비용 승인이 필요.
