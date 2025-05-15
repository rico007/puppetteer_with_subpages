const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

// Konfiguration aus Umgebungsvariablen oder Fallback
const MAX_DEPTH = parseInt(process.env.MAX_DEPTH || '2');
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '20');

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' parameter" });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const visited = new Set();
  const emails = new Set();

  async function crawl(currentUrl, depth = 0) {
    if (visited.has(currentUrl) || depth > MAX_DEPTH || visited.size >= MAX_PAGES) return;
    visited.add(currentUrl);

    try {
      const page = await browser.newPage();
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const html = await page.content();
      const foundEmails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
      foundEmails.forEach(email => emails.add(email));

      if (depth < MAX_DEPTH && visited.size < MAX_PAGES) {
        const links = await page.$$eval('a[href]', anchors =>
          anchors.map(a => a.href).filter(href => href.startsWith('http'))
        );
        const baseDomain = new URL(url).hostname;
        const sameDomainLinks = links.filter(l => {
          try {
            return new URL(l).hostname === baseDomain;
          } catch {
            return false;
          }
        });

        for (const link of sameDomainLinks) {
          if (visited.size >= MAX_PAGES) break;
          await crawl(link, depth + 1);
        }
      }

      await page.close();
    } catch (err) {
      console.error(`Failed to scrape ${currentUrl}: ${err.message}`);
    }
  }

  await crawl(url);
  await browser.close();

  res.json({ emails: Array.from(emails) });
});

app.listen(PORT, () => {
  console.log(`✅ Scraper listening on port ${PORT}`);
});
