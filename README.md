# Maple Personal Dashboard - No API

NEXON API 불러오는 GitHub Pages + Supabase만 사용하는 개인 메이플 대시보드입니다.

## 기능
- 이메일/비밀번호 로그인
- 여러 기기 데이터 동기화
- 일일/주간 체크리스트
- 주간/월간 보스 수익
- 캐릭터 정보 자동 입력
- 월간 요약
- RLS로 본인 데이터만 접근

## 설치
1. Supabase 프로젝트 생성
2. SQL Editor에서 `schema.sql` 실행
3. `config.js`에 Supabase URL과 Publishable Key 입력
4. GitHub 저장소에 업로드
5. GitHub Pages 활성화

## 주의
`config.js`에는 Publishable Key만 넣으세요.
service_role 또는 Secret Key를 넣으면 안 됩니다.
