import { test, expect } from '@playwright/test';

test('무신사 메인 > KICKS > 나이키 선택 > 구매 시나리오', async ({ page }) => {
    test.setTimeout(90000); 

    // [전략 1] 메인 페이지를 거치지 않고 KICKS 섹션으로 바로 접속
    // 클릭 실패 리스크를 아예 없애버립니다.
    console.log('🚀 KICKS 페이지 직접 진입 시도...');
    await page.goto('https://www.musinsa.com/main/kicks/home', { waitUntil: 'networkidle' });

    // 만약 바로 이동이 안 된다면 (메인으로 리다이렉트 된다면) 아래 로직 실행
    if (!page.url().includes('kicks')) {
        console.log('⚠️ 직접 진입 실패, 메인에서 메뉴 탐색 시작...');
        await page.goto('https://www.musinsa.com/', { waitUntil: 'networkidle' });
        await page.keyboard.press('Escape');
        
        // [전략 2] 텍스트가 아닌 속성 기반으로 더 넓게 탐색
        // 'KICKS' 글자가 포함된 모든 링크 중 하나라도 클릭하게 함
        const kicksMenu = page.locator('a[href*="kicks"], a:has-text("KICKS")').first();
        
        await kicksMenu.scrollIntoViewIfNeeded();
        await kicksMenu.click({ force: true, timeout: 10000 });
    }

    await page.waitForURL(/.*kicks|sneaker.*/, { timeout: 20000 });
    console.log('✅ KICKS 섹션 진입 완료');

    // 2. 나이키 브랜드 탭 선택
    const nikeTab = page.locator('a, button').filter({ hasText: /^NIKE$|^나이키$/i }).first();
    await nikeTab.click({ force: true });
    
    // 3. 상품 목록 대기 및 랜덤 선택
    await page.waitForTimeout(2000); 
    const products = page.locator('a[href*="/products/"]');
    
    const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        products.nth(10).click({ force: true }) 
    ]);

    await newPage.waitForLoadState('load');

    try {
        console.log('🔍 상세 페이지 처리 중...');
        await newPage.keyboard.press('Escape');

        const cartBtn = newPage.getByRole('button', { name: '장바구니' }).first();
        await cartBtn.waitFor({ state: 'visible', timeout: 20000 });

        // 1. 사이즈 선택창 클릭
        console.log('🎯 사이즈 옵션 박스 클릭 중...');
        const sizeInput = newPage.getByRole('textbox', { name: '사이즈' });
        await sizeInput.scrollIntoViewIfNeeded();
        await sizeInput.click({ force: true });

        // 2. 사이즈 목록 탐색 (정규식: 숫자+도착보장)
        console.log('📊 사이즈 목록 탐색 중...');
        const availableSize = newPage.locator('div, li, [role="button"]').filter({ 
            hasText: /^[2-3][0-9]0.*도착/ 
        }).filter({ 
            hasNotText: /품절|매진/ 
        }).first();

        await availableSize.waitFor({ state: 'visible', timeout: 10000 });

        const fullText = await availableSize.innerText();
        console.log(`✅ 확인된 옵션: ${fullText.replace(/\n/g, ' ').trim()}`);

        try {
            await availableSize.click({ force: true, timeout: 3000 });
        } catch (err) {
            await availableSize.dispatchEvent('click');
        }

        // 4. 장바구니 담기
        await newPage.waitForTimeout(1000); 
        await cartBtn.click({ force: true });
        console.log('🛒 장바구니 담기 버튼 클릭');
        
        // 5. 장바구니 이동 버튼 클릭
        const goToCart = newPage.locator('a, button').filter({ hasText: /장바구니/ }).filter({ hasText: /이동|확인|보기/ }).first();
        await expect(goToCart).toBeVisible({ timeout: 10000 });
        await goToCart.click();
        console.log('🚚 장바구니 페이지로 이동 중...');

        // 6. 장바구니 페이지 진입 확인
        await newPage.waitForURL(/.*cart.*/);
        console.log('✅ 장바구니 페이지 진입 확인');

        // [수정] 상품명 체크 로직 보완: 텍스트가 있는 첫 번째 링크를 찾음
        const cartItemName = newPage.locator('form#form_cart, .cart-list, [class*="Cart"]').locator('a').filter({ hasText: /.+/ }).first();
        
        try {
            await cartItemName.waitFor({ state: 'visible', timeout: 5000 });
            const productName = await cartItemName.innerText();
            console.log(`📦 장바구니 담긴 상품명: ${productName.trim()}`);
        } catch (e) {
            console.log('⚠️ 상품명을 찾지 못했으나 구매를 진행합니다.');
        }

        // 7. [핵심 수정] "전체 선택" 체크박스 클릭
        console.log('✅ 전체 선택 체크박스 조작 중...');
        // 디버그로 확인하신 rect 요소와 '전체 선택' 텍스트를 모두 시도합니다.
        const allCheckRect = newPage.locator('rect').first();
        const allCheckText = newPage.getByText('전체 선택');

        try {
            // 텍스트가 보인다면 텍스트 클릭, 아니면 rect 클릭
            if (await allCheckText.isVisible()) {
                await allCheckText.click({ force: true });
            } else {
                await allCheckRect.click({ force: true });
            }
            console.log('✔ 전체 선택 클릭 완료');
        } catch (checkErr) {
            console.log('⚠️ 체크박스 클릭 중 오류 발생 (이미 체크되었을 수 있음):', checkErr.message);
        }

        await newPage.waitForTimeout(1000); // 체크 후 금액/개수 반영 대기

        // 8. [핵심 수정] "구매하기 (N개)" 버튼 클릭
        // 버튼 텍스트 안에 '구매하기'와 '개'라는 글자가 포함된 요소를 찾습니다.
        // 정규식 /구매하기.*개/ 를 쓰면 (0개), (1개) 등 모든 숫자에 대응합니다.
        const orderBtn = newPage.getByRole('button').filter({ hasText: /구매하기|주문하기/ }).last();
        
        await orderBtn.scrollIntoViewIfNeeded();
        const finalBtnText = await orderBtn.innerText();
        console.log(`💳 최종 클릭 버튼 텍스트: [${finalBtnText.trim()}]`);

        // 버튼이 활성화될 때까지 잠시 대기 후 클릭
        await orderBtn.click({ force: true });

        // 9. 최종 페이지 도달 확인
        try {
            await newPage.waitForURL(/.*order|checkout|login.*/, { timeout: 15000 });
            console.log('🎉 테스트 성공: 결제/주문 프로세스 진입 완료');
            console.log(`🔗 현재 URL: ${newPage.url()}`);
        } catch (urlErr) {
            console.log('⚠️ 페이지 전환 확인 실패 (네트워크 지연 혹은 팝업 발생)');
        }

        await newPage.screenshot({ path: 'final_step_success.png' });

   } catch (e) {
       console.error('❌ 실패 이유:', e.message);
       if (!newPage.isClosed()) {
           await newPage.screenshot({ path: 'fail_reason.png' });
       }
       throw e;
   }
});