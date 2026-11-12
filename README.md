# grammarTest

토익 문법 300문항을 챕터별로 풀고 오답을 복습하는 Vue 앱입니다.

```sh
npm ci
npm run build
npm run preview
```

PWA는 HTTPS 또는 로컬 미리보기에서 동작합니다. 브라우저의 앱 설치 메뉴를 사용하세요. iPhone에서는 Safari의 공유 메뉴에서 **홈 화면에 추가**를 선택하면 됩니다. 온라인에서 한 번 열어 오프라인 준비가 끝나면 인터넷 연결 없이 문제와 해설을 볼 수 있습니다. 풀이와 오답은 이 기기의 브라우저 저장소에 보관됩니다.

배포할 때는 `dist/` 전체를 같은 경로에 올립니다.

## Firebase 기록 동기화

Firebase 프로젝트 `grammartest-4331c`에 Cloud Firestore 기본 데이터베이스가 있어야 합니다. Firebase Authentication에서 Google 로그인 제공업체를 켜고, 앱을 여는 호스트를 승인된 도메인에 추가합니다. 예를 들어 GitHub Pages 주소가 `https://navy160523.github.io/grammarTest/`라면 `navy160523.github.io`를 추가합니다.

Cloud Firestore의 **규칙** 탭에서 `firestore.rules`에 있는 `/users/{uid}/grammarProgress/{chapter}` 규칙을 적용합니다. 프로젝트에 다른 규칙이 있다면 해당 경로의 규칙만 추가하고, 이 경로에도 적용되는 전체 공개 규칙이 있는지 확인합니다.

로그인한 계정의 기록은 기기 간에 동기화됩니다. 같은 챕터를 여러 기기에서 수정하면 Firestore에 마지막으로 반영된 기록이 사용됩니다. 기존 브라우저 기록은 첫 로그인 때 계정에 아직 기록이 없는 챕터만 가져옵니다.
