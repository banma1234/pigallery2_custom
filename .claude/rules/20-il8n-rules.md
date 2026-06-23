# i18n 규칙 (영어/한국어 2개 언어 유지)

이 프로젝트는 **영어(en, 소스)와 한국어(ko)** 두 언어만 지원한다. 새 UI/페이지/문자열을 추가할 때는 아래 규칙을 **항상** 지켜서 두 언어로 정상 표시되도록 한다. Angular i18n은 **빌드 시점** 방식이며 런타임 자동 번역이 아니다.

## 핵심 원칙

- 사용자에게 보이는 모든 문자열은 **반드시 i18n 마커**를 단다. 마커가 없으면 번역 대상이 아니며 하드코딩된다.
- **소스 텍스트는 영어로 작성**한다(소스 로케일 = en). 영어는 마커만 있으면 자동 표시된다.
- 한국어는 자동이 아니다. 번역이 없으면 영어로 폴백된다(빌드 시 경고만, 에러 아님).
- 지원 언어는 en, ko 뿐이다. **다른 로케일을 추가하지 않는다.**

## 마킹 방법

### 템플릿(HTML)
- 엘리먼트 텍스트: `i18n` 속성을 단다.
  ```html
  <span i18n>Photos</span>
  <button i18n>Save</button>
  ```
- 속성 텍스트: `i18n-<속성>` 형태로 단다.
  ```html
  <button i18n-aria-label aria-label="Close menu">…</button>
  <input i18n-placeholder placeholder="Search" />
  <img i18n-title title="Cover photo" />
  ```
- 동적 값은 보간으로 두고 고정 문구만 번역한다.
  ```html
  <span i18n>Photos</span>: {{ count }}
  ```

### 코드(TypeScript)
- 사용자에게 보이는 문자열은 `$localize` 태그드 템플릿으로 감싼다.
  ```ts
  this.title = $localize`Dark mode`;
  throw new Error($localize`Failed to load folder`); // 사용자에게 노출되는 메시지만
  ```
- 로그, 내부 디버그, DB 키, 설정 키 등 **사용자에게 보이지 않는 문자열은 마킹하지 않는다.**

## 새 문자열 추가 후 워크플로우 (한국어 반영)

새 문자열을 추가/수정했으면 단계 끝에 한 번 묶어서 처리한다.

1. 문자열에 i18n 마커를 단다(위 규칙).
2. 소스 재추출:
   ```
   npx gulp extract-locale
   ```
   → `locale.source.xlf`에 신규 문자열과 해당 `trans-unit id`가 생성된다.
3. `src/frontend/translate/messages.ko.xlf`에 신규 문자열의 한국어 `<target>`을 추가한다.
   - **id는 재추출된 소스의 trans-unit id와 정확히 일치**해야 한다.
   - 형식:
     ```xml
     <trans-unit id="<소스의 id>" datatype="html">
       <source>English text</source>
       <target>한국어 번역</target>
     </trans-unit>
     ```
   - 번역하지 않은 문자열은 ko 파일에 없어도 되며, 빌드 시 영어로 폴백된다.
4. 빌드(영어+한국어):
   ```
   npm run build
   ```
   (`--languages=en,ko`로 두 언어만 빌드된다.)

## 번역 품질 규칙

- 한국어는 간결하고 자연스러운 UI 용어를 쓴다. 직역체/기계번역체를 피한다.
- UI 일관성을 위해 동일 개념은 동일 용어로 번역한다. 공통 용어집:
  - Photos=사진, Albums=앨범, Faces=인물, Gallery=갤러리
  - Settings=설정, Search=검색, Download=다운로드, Upload=업로드
  - Share=공유, Save=저장, Cancel=취소, Delete=삭제, Close=닫기
  - Favorites=즐겨찾기, Dark mode=다크 모드
- 너무 길어 레이아웃을 깨는 번역은 줄여 쓴다.

## 하지 말 것

- 마커 없이 한국어/영어 텍스트를 템플릿이나 코드에 직접 박지 않는다.
- en, ko 외 언어팩(`messages.*.xlf`)을 추가하지 않는다.
- `messages.ko.xlf`에 소스에 없는 임의의 id를 넣지 않는다(매칭 실패 → 번역 누락).

## 관련 파일

- 소스(영어): `src/frontend/translate/messages.en.xlf`
- 한국어: `src/frontend/translate/messages.ko.xlf`
- 로케일 설정: `angular.json`(i18n.locales = ko), `package.json`(build = `--languages=en,ko`)
