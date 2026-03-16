require('dotenv').config();
const axios = require('axios');

class SlackReporter {

  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  onTestEnd(test, result) {
    this.results.push({
      title: test.title,
      file: test.location.file,
      status: result.status
    });
  }

  async onEnd() {
    const webhook = process.env.SLACK_WEBHOOK_URL;

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    const failedTests = this.results
      .filter(r => r.status === 'failed')
      .map(r => `❌ ${r.file} - ${r.title}`)
      .join('\n') || "없음";

    const message = {
      text: `🚀 *Playwright 테스트 결과*

총 테스트: ${total}
성공: ${passed}
실패: ${failed}

⏱ 실행시간: ${duration}초

*실패 테스트*
${failedTests}`
    };

    await axios.post(webhook, message);
  }
}

module.exports = SlackReporter;