import {useEffect,useRef,useState} from 'react';
import {useEditorStore} from '@/store/editorStore';
import {downloadJSON,exchangeDocument,parseExchange} from '@/lib/designExchange';
const services=[
  {id:'figma',name:'Figma',description:'텍스트·이미지·도형을 편집 가능한 레이어로 교환합니다.',url:'https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/'},
  {id:'weave',name:'Figma Weave',description:'공개한 워크플로의 실행과 결과 조회를 지원합니다. 결과 형식은 워크플로에 따라 다르며 편집 레이어 왕복은 보장되지 않습니다.',url:'https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/'},
];
export default function ConnectionsDialog({onClose}:{onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null), file=useRef<HTMLInputElement>(null);
  const [message,setMessage]=useState('');
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} className="connections-dialog" onCancel={onClose} aria-labelledby="connections-title">
    <header><h2 id="connections-title">MCP 연결</h2><button onClick={onClose} aria-label="연동 창 닫기">×</button></header>
    <p>현재 이 웹앱에는 Figma OAuth 연결이 설정되지 않았습니다. Codex에서 연결한 계정은 이 사이트와 공유되지 않습니다.</p>
    {services.map(s=><section key={s.id}><h3>{s.name} <small>연결 안 됨</small></h3><p>{s.description}</p><a href={s.url} target="_blank" rel="noreferrer">연결 설정 안내 ↗</a><button onClick={()=>setMessage(`${s.name}: 웹앱용 OAuth 클라이언트 등록, HTTPS 콜백 주소, 서버 측 토큰 보관·갱신 구현이 필요합니다. 현재 연결할 수 없으며 인증 정보를 입력받지 않습니다.`)}>연결하기 · 설정 필요</button></section>)}
    <section><h3>Figma 레이어 교환 · 파일 방식</h3><p>MCP 인증 없이 쓸 수 있는 개발용 Figma 플러그인입니다. 디자인 JSON을 주고받으며 텍스트·사진·도형을 각각 편집합니다.</p>
      <ol><li><a href="/figma-bridge.zip" download>Figma 교환 플러그인 다운로드</a> 후 압축을 풉니다.</li><li>Figma 데스크톱 → Plugins → Development → Import plugin from manifest에서 manifest.json을 선택합니다.</li><li>아래에서 디자인을 저장하고 플러그인에서 불러옵니다. 반대로 Figma의 프레임을 선택하고 플러그인에서 저장한 JSON을 여기서 가져옵니다.</li></ol>
      <button onClick={async()=>{try{downloadJSON(await exchangeDocument(useEditorStore.getState().document),'jia-design.json');setMessage('디자인 JSON을 저장했습니다.');}catch{setMessage('이미지 로딩이 끝난 후 다시 저장해 주세요.');}}}>디자인 JSON 저장</button>
      <button onClick={()=>file.current?.click()}>Figma 결과 JSON 가져오기</button>
      <input ref={file} type="file" accept=".json" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>50_000_000)throw new Error('50MB 이하의 파일을 선택하세요.');const d=parseExchange(JSON.parse(await f.text()));useEditorStore.getState().commit(d);setMessage('가져왔습니다. Ctrl+Z로 이전 디자인으로 되돌릴 수 있습니다.');}catch(error){setMessage(error instanceof Error?error.message:'가져오기 실패');}}}/>
      <p>중첩 그룹·벡터·지원하지 않는 효과는 Figma에서 이미지로 변환됩니다. 산돌 등 글꼴은 양쪽 PC에 설치되어 있어야 합니다. Weave 파일은 이 교환 형식으로 직접 지원하지 않습니다.</p>
    </section><p role="status">{message}</p><button onClick={onClose}>닫기</button>
  </dialog>;
}
