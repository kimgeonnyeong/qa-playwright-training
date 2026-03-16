import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  /* 리포트 설정: HTML, List와 함께 Allure 리포터를 추가합니다 */
  reporter: [
    ['html', { open: 'never' }],
    ['list'], // 터미널 로그 출력용
    ['./slack-reporter.js'],
    ['allure-playwright', { outputFolder: 'allure-results' }] // Allure 결과 파일 저장 경로
  ],
  
  use: {
    /* 1. 기본 브라우저 설정 및 한국어 환경 고정 */
    headless: true,
    locale: 'ko-KR',           // 깃허브 서버에서도 한국어 페이지가 뜨도록 설정
    timezoneId: 'Asia/Seoul',  // 시간대 서울 고정
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    
    /* 2. 디버깅 및 보안 설정 */
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,

    /* 3. 권한 설정 (팝업 방지 및 위치 고정) */
    permissions: ['notifications', 'geolocation'],
    geolocation: { longitude: 127.1086, latitude: 37.4012 },

    /* 4. 브라우저 실행 옵션 */
    launchOptions: {
      slowMo: 800,      // 동작 간격 조절 (서버 부하 방지)
      args: [
        '--start-maximized',       // 창 최대화 실행
        '--disable-notifications'  // 알림 차단
      ]
    }
  },
});