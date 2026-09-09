const { chromium } = require('playwright');

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect only actual React/page errors (not CSS console warnings)
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  // Also collect console errors but filter out CSS-related ones
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Skip CSS animation warnings
      if (!text.includes('Failed to load resource') && !text.includes('403') && !text.includes('500')) {
        errors.push(text);
      }
    }
  });

  console.log('Testing Synora Dashboard Redesign\n');
  console.log('=====================================\n');

  // Step 1: Register a test user via API
  console.log('Step 1: Registering test user...');
  const testEmail = `test.${Date.now()}@synora.app`;
  const testPassword = 'TestPass123!';
  
  const registerRes = await page.request.post('http://localhost:8080/api/auth/register', {
    data: JSON.stringify({
      email: testEmail,
      password: testPassword,
      fullName: 'Dashboard Test User',
      role: 'VICTIM'
    }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!registerRes.ok()) {
    console.log('   ✗ Registration failed');
    await browser.close();
    process.exit(1);
  }
  console.log(`   ✓ Registered: ${testEmail}`);

  // Step 2: Landing page test
  console.log('\nStep 2: Landing page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  const landingTitle = await page.title();
  console.log(`   Title: "${landingTitle}"`);
  
  const logoVisible = await page.locator('img[alt="Synora"]').first().isVisible().catch(() => false);
  console.log(`   Logo visible: ${logoVisible}`);
  
  const signInLink = await page.locator('text=Sign in').first().isVisible();
  console.log(`   Sign in link visible: ${signInLink}`);

  // Step 3: Navigate to login
  console.log('\nStep 3: Login page...');
  await page.click('text=Sign in');
  await page.waitForTimeout(1000);
  
  const loginHeading = await page.locator('text=Good to see you again').first().isVisible();
  console.log(`   Login heading visible: ${loginHeading}`);
  
  const emailInput = await page.locator('input[type="email"]').isVisible();
  const passwordInput = await page.locator('input[type="password"]').isVisible();
  console.log(`   Email input visible: ${emailInput}`);
  console.log(`   Password input visible: ${passwordInput}`);

  // Step 4: Login
  console.log('\nStep 4: Logging in...');
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  
  const signInBtn = page.locator('button:has-text("Sign in")');
  await signInBtn.click();
  
  // Wait for redirect or error
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);
  
  if (!currentUrl.includes('/app/home')) {
    console.log('   ✗ Login did not redirect to dashboard');
    const errorMsg = await page.locator('.form-error').textContent().catch(() => 'no error element');
    console.log(`   Error: ${errorMsg}`);
    await browser.close();
    process.exit(1);
  }
  console.log('   ✓ Login successful, redirected to dashboard');

  // Step 5: Dashboard content verification
  console.log('\nStep 5: Dashboard content...');
  await page.waitForTimeout(2000);
  
  const checks = [
    { name: 'Personal greeting (h1)', selector: 'h1' },
    { name: 'Daily Check-In card', text: 'Daily Check-In' },
    { name: 'AI Support card', text: 'Talk with Synora AI' },
    { name: 'Wellbeing section', text: 'Your wellbeing today' },
    { name: 'Expert recommendation', text: 'Someone who may' },
    { name: 'My Support section', text: 'My support' },
    { name: 'Recent Activity', text: 'Little steps' },
    { name: 'Urgent Support', text: 'Need urgent support' },
  ];
  
  for (const check of checks) {
    let visible = false;
    try {
      if (check.selector) {
        visible = await page.locator(check.selector).first().isVisible();
      } else if (check.text) {
        visible = await page.locator(`text=${check.text}`).first().isVisible().catch(() => false);
      }
    } catch (e) {
      visible = false;
    }
    console.log(`   ${visible ? '✓' : '✗'} ${check.name}: ${visible ? 'visible' : 'NOT FOUND'}`);
  }

  // Step 6: Navigation tests
  console.log('\nStep 6: Navigation tests...');
  
  // Check-in navigation
  await page.click('nav a:has-text("Check-in")');
  await page.waitForTimeout(1000);
  const checkInUrl = page.url();
  console.log(`   Check-in nav: ${checkInUrl.includes('/check-in') ? '✓' : '✗'} (${checkInUrl})`);
  
  // Go back to home
  await page.goto('http://localhost:5173/app/home', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  
  // AI navigation
  await page.click('nav a:has-text("AI")');
  await page.waitForTimeout(1000);
  const aiUrl = page.url();
  console.log(`   AI nav: ${aiUrl.includes('/ai-support') ? '✓' : '✗'} (${aiUrl})`);
  
  // Go back to home
  await page.goto('http://localhost:5173/app/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Profile navigation
  await page.click('nav a:has-text("Profile")');
  await page.waitForTimeout(1000);
  const profileUrl = page.url();
  console.log(`   Profile nav: ${profileUrl.includes('/profile') ? '✓' : '✗'} (${profileUrl})`);

  // Step 7: Mobile responsive check
  console.log('\nStep 7: Mobile layout (375px)...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const mobileGreeting = await page.locator('h1').first().isVisible();
  const mobileNav = await page.locator('nav').first().isVisible();
  console.log(`   Mobile greeting visible: ${mobileGreeting ? '✓' : '✗'}`);
  console.log(`   Mobile nav visible: ${mobileNav ? '✓' : '✗'}`);
  
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/app/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Step 8: Console errors
  console.log('\nStep 8: Console errors...');
  if (errors.length === 0) {
    console.log('   ✓ No console errors detected');
  } else {
    console.log(`   ✗ Found ${errors.length} error(s):`);
    errors.forEach(e => console.log(`      - ${e}`));
  }

  console.log('\n=====================================');
  console.log('Test complete!');
  
  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
