const puppeteer = require('puppeteer');

const MAX_DEPTH = parseInt(process.env.MAX_DEPTH) || 2;
const MAX_PAGES = parseInt(process.env.MAX_PAGES) || 20;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const visited = new Set();
  const emails = new Set();

  async function crawl(url, depth = 0) {
    if (depth > MAX_DEPTH || visited.size >= MAX_PAGES) return;
    if (visited.has(url)) return;
    visited.add(url);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const content = await page.content();

      // Extract emails
      const pageEmails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
      pageEmails.forEach(email => emails.add(email));

      // Extract internal links
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => a.href).filter(href => href.startsWith('http'))
      );

      // Filter links to the same domain
      const sameDomainLinks = links.filter(link => new URL(link).hostname === new URL(url).hostname);

      // Recursively crawl subpages
      for (const link of sameDomainLinks) {
        await crawl(link, depth + 1);
      }
    } catch (err) {
      console.error(`Error crawling ${url}:`, err.message);
    }
  }

  const startUrl = 'https://example.com';
  await crawl(startUrl);

  console.log('Found emails:', Array.from(emails));

  await browser.close();
})();
