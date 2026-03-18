import { test, expect } from '@playwright/test'; // browser는 여기서 import 하지 않습니다!

// 테스트 인자(Fixtures) 부분에서 { browser }를 가져옵니다.
test('무신사 메인 > KICKS > 나이키 선택 > 구매 시나리오', async ({ browser }) => {
    // 1. 브라우저 컨텍스트 자체를 크게 생성 (시작부터 1080p 고정)
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage(); 
    
    test.setTimeout(120000); 

    console.log('🚀 KICKS 페이지 진입 시도...');
    await page.goto('https://www.musinsa.com/main/sneaker/recommend?gf=A', { waitUntil: 'networkidle' });

    // 나이키 브랜드 탭 선택
    const nikeTab = page.locator('a, button').filter({ hasText: /^NIKE$|^나이키$/i }).first();
    await nikeTab.click({ force: true });
    
    await page.waitForTimeout(3000); 
    const products = page.locator('a[href*="/products/"]');
    
    // 랜덤 상품 선택
    const productCount = await products.count();
    const randomIndex = Math.floor(Math.random() * Math.min(productCount, 20)) || 1; 
    console.log(`🎯 랜덤 선택된 인덱스: ${randomIndex}번째 상품`);

    // 2. 새 창이 뜰 때 기존 context 설정을 그대로 물려받게 함
    const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        products.nth(randomIndex).click({ force: true })
    ]);

    // 이제 newPage는 처음 태어날 때부터 1920x1080입니다. 깜빡임이 사라집니다.
    await newPage.waitForLoadState('load');

    try {
        console.log('🔍 상세 페이지 처리 중...');
        await newPage.keyboard.press('Escape');

        const cartBtn = newPage.getByRole('button', { name: '장바구니' }).first();
        await cartBtn.waitFor({ state: 'visible', timeout: 20000 });

        // --- 사이즈 선택 로직 (사용자 성공 코드 고정) ---
        console.log('🎯 사이즈 옵션 박스 클릭 중...');
        const sizeInput = newPage.getByRole('textbox', { name: '사이즈' });
        await sizeInput.scrollIntoViewIfNeeded();
        await sizeInput.click({ force: true });

        console.log('📊 사이즈 목록 탐색 중...');
        const availableSize = newPage.locator('div, li, [role="button"]').filter({ 
            hasText: /^[2-3][0-9]0.*도착/ 
        }).filter({ 
            hasNotText: /품절|매진/ 
        }).first();

        await availableSize.waitFor({ state: 'visible', timeout: 10000 });
        const fullText = await availableSize.innerText();
        console.log(`✅ 확인된 옵션: ${fullText.replace(/\n/g, ' ').trim()}`);

        await availableSize.click({ force: true });

        // 4. 장바구니 담기
        await newPage.waitForTimeout(1000); 
        await cartBtn.click({ force: true });
        
        // 5. 장바구니 이동 버튼 클릭
        const goToCart = newPage.locator('a, button').filter({ hasText: /장바구니/ }).filter({ hasText: /이동|확인|보기/ }).first();
        await goToCart.click();

        // 6. 장바구니 페이지 진입 확인
        await newPage.waitForURL(/.*cart.*/);
        const allCheckText = newPage.getByText('전체 선택');
        if (await allCheckText.isVisible()) {
            await allCheckText.click({ force: true });
        }
        
        await newPage.waitForTimeout(1500); 
        const orderBtn = newPage.getByRole('button').filter({ hasText: /구매하기|주문하기/ }).last();
        await orderBtn.click({ force: true });

        await newPage.waitForURL(/.*order|checkout|login.*/, { timeout: 20000 });
        console.log('🎉 테스트 성공: 모든 창이 일관된 크기로 실행되었습니다.');
        
   } catch (e) {
       console.error('❌ 실패 이유:', e.message);
       throw e;
   } finally {
       // 테스트가 끝나면 직접 만든 context를 닫아 메모리를 관리합니다.
       await context.close();
   }
});