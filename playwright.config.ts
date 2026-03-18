import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /* CI 환경에서는 타임아웃을 넉넉하게 잡습니다 (기본 30초 -> 60초) */
  timeout: 60000,
  
  /* 리포트 설정 */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['./slack-reporter.js'],
    ['allure-playwright', { outputFolder: 'allure-results' }]
  ],

  /* CI 환경과 로컬 환경에 따라 워커 수를 조절합니다 */
  workers: process.env.CI ? 2 : undefined,

  use: {
    /* 1. 실행 모드 설정 */
    // CI 환경에서는 무조건 headless, 로컬에서는 필요에 따라 조절 가능하도록 설정
    headless: process.env.CI ? true : true, 
    
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    
    /* 2. 브라우저 크기 (중요: 메뉴 숨김 방지) */
    // 해상도가 낮으면 KICKS 메뉴가 '더보기' 안으로 들어갈 수 있습니다.
    viewport: { width: 1920, height: 1080 },
    
    /* 3. 디버깅 설정 */
    video: 'retain-on-failure',
    trace: 'retain-on-failure', // 실패 시 trace.zip 생성
    screenshot: 'only-on-failure',

    /* 4. 네트워크 및 대기 전략 */
    actionTimeout: 15000, // 개별 액션(클릭 등) 제한 시간
    navigationTimeout: 30000, // 페이지 이동 제한 시간

    launchOptions: {
      /* [수정] slowMo는 CI 환경에서 성능 저하의 원인이 됩니다 */
      // 로컬에서만 0.5초 정도로 쓰고, CI(GitHub Actions)에서는 0으로 설정하세요.
      slowMo: process.env.CI ? 0 : 500, 
      
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-notifications',
        '--window-size=1920,1080'
      ]
    }
  },

  /* 브라우저별 테스트 (필요 시 활성화) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});