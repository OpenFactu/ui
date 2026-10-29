const { chromium } = require('playwright-core');
const fs = require('node:fs'); const path = require('node:path');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const output = process.argv[2] || '.shots/mobile-redesign-before';
  fs.mkdirSync(output, { recursive: true });
  const meta = await (await fetch(`${base}/meta.json`)).json();
  const seen = new Set();
  const stories = Object.keys(meta.stories).filter(id => { const group = id.split('--')[0]; if (process.env.SHOTS_SAMPLE !== '1') return true; if (seen.has(group)) return false; seen.add(group); return true; });
  const jobs = stories.flatMap(id => ['light', 'dark'].map(theme => ({ id, theme }))).filter(({ id, theme }) => !fs.existsSync(path.join(output, `${id}--${theme}.png`)));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let index = 0; const errors = [];
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      const page = await browser.newPage({ viewport: { width: Number(process.env.SHOTS_WIDTH || 1280), height: 800 }, reducedMotion: 'reduce' });
      while (index < jobs.length) {
        const { id, theme } = jobs[index++];
        try {
          await page.goto(`${base}/?story=${id}&theme=${theme}&mode=preview`, { waitUntil: 'networkidle' });
          await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
          await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}' });
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(output, `${id}--${theme}.png`), fullPage: true });
        } catch (error) { errors.push(`${id}/${theme}: ${error.message}`); }
      }
      await page.close();
    }));
  } finally { await browser.close(); }
  console.log(`${jobs.length} capturas nuevas; ${fs.readdirSync(output).filter(name => name.endsWith('.png')).length} totales → ${output}`);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
})().catch(error => { console.error(error); process.exitCode = 1; });
