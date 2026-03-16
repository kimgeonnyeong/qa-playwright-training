import { test, expect } from '@playwright/test';

test('무신사 메인 > KICKS > 나이키 선택 > 구매 시나리오', async ({ page }) => {
    test.setTimeout(90000); 

    await page.goto('https://www.musinsa.com/', { waitUntil: 'load' });

    console.log('🚀 KICKS 메뉴 진입 중...');
    const kicksMenu = page.locator('a').filter({ hasText: 'KICKS' }).first();
    await kicksMenu.click();
    await page.waitForURL(/.*kicks|sneaker.*/);

    // 2. 나이키 브랜드 탭 선택
    const nikeTab = page.locator('a, button').filter({ hasText: /^NIKE$|^나이키$/i }).first();
    await nikeTab.click({ force: true });
    
    // 3. 상품 목록 대기 및 랜덤 선택
    await page.waitForTimeout(2000); 
    const products = page.locator('a[href*="/products/"]');
    
    const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        products.nth(10).click({ force: true }) // 10번째 정도로 넉넉히 선택
    ]);

    await newPage.waitForLoadState('load');

    try {
        console.log('🔍 상세 페이지 처리 중...');
        await newPage.keyboard.press('Escape');

        const cartBtn = newPage.getByRole('button', { name: '장바구니' }).first();
        await cartBtn.waitFor({ state: 'visible', timeout: 20000 });

        // 4. 사이즈 선택 박스 클릭
        const sizeTrigger = newPage.locator('button').filter({ hasText: /사이즈|옵션/ }).first();
        await sizeTrigger.scrollIntoViewIfNeeded();
        await sizeTrigger.click({ force: true });
        console.log('🎯 사이즈 옵션 박스 열기 완료');

        // 5. [중요 수정] 실제 사이즈(숫자)가 포함된 리스트 아이템 선택
        // 무신사 사이즈는 보통 230, 240 또는 26size 처럼 숫자로 시작하거나 포함됩니다.
        await newPage.waitForTimeout(1500); // 리스트 팝업 애니메이션 대기
        
        // 버튼이나 리스트 아이템 중 텍스트가 오직 숫자로만 구성되거나 사이즈 패턴인 것 선택
        const sizeOptions = newPage.locator('li[role="option"], [class*="option"] li, .option-item')
            .filter({ hasText: /^(1\d{2}|2\d{2}|3\d{2})$/ }); // 100~300 사이의 숫자(신발 사이즈)만 필터링

        const count = await sizeOptions.count();
        console.log(`📊 발견된 사이즈 옵션 개수: ${count}개`);

        let isSelected = false;
        for (let i = 0; i < count; i++) {
            const option = sizeOptions.nth(i);
            const text = await option.innerText();
            
            // 품절이 아니고, 텍스트에 숫자가 명확히 포함된 경우만 클릭
            if (!text.includes('품절') && !text.includes('매진')) {
                console.log(`✨ 실제 사이즈 선택: ${text.trim()}`);
                await option.click({ force: true });
                isSelected = true;
                break;
            }
        }

        if (!isSelected) {
            // 위 필터로 안 잡힐 경우를 대비한 백업 로직 (단순 첫 번째 숫자 항목)
            console.log('⚠️ 정교한 필터로 실패하여 백업 선택 시도...');
            await newPage.locator('li[role="option"]').filter({ hasNotText: /품절/ }).first().click({ force: true });
        }

        // 6. 장바구니 담기
        await newPage.waitForTimeout(500); // 선택 반영 대기
        await cartBtn.click({ force: true });
        console.log('🛒 장바구니 담기 버튼 클릭');
        
        // 7. 장바구니 이동 버튼 확인 (이게 클릭되어야 진짜 담긴 것임)
        const goToCart = newPage.locator('a, button').filter({ hasText: /장바구니/ }).filter({ hasText: /이동|확인/ }).first();
        
        await expect(goToCart).toBeVisible({ timeout: 10000 }); // 여기서 실패하면 담기에 실패한 것
        await goToCart.click();

        // 8. 최종 확인
        await newPage.waitForURL(/.*cart.*/);
        const cartItem = newPage.locator('.cart-item, [class*="CartItem"]');
        await expect(cartItem.first()).toBeVisible();
        console.log('✅ 장바구니 내 상품 확인 완료');

    } catch (e) {
        console.error('❌ 실패 이유:', e.message);
        await newPage.screenshot({ path: 'fail_reason.png' });
        throw e;
    }
});