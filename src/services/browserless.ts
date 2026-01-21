import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config/config';
import { contentProcessor } from './content-processor';

export interface YargitayResult {
  siraNo: string;
  daire: string;
  esas: string;
  karar: string;
  tarih: string;
  icerik: string;
}

export interface ScrapingOptions {
  maxResults?: number;
  includeFullContent?: boolean;
  parallelRequests?: number;
  adaptiveTimeout?: boolean;
}

export class BrowserlessService {
  private get wsEndpoint(): string {
    // Ensure URL starts with wss:// or ws:// and ends with token
    let url = config.browserless.url.replace(/^http/, 'ws');
    if (!url.includes('token=')) {
      url = `${url}?token=${config.browserless.token}`;
    }
    return url;
  }

  /**
   * Connect to Browserless
   */
  private async connectBrowser(): Promise<Browser> {
    try {
      return await puppeteer.connect({
        browserWSEndpoint: this.wsEndpoint,
        defaultViewport: { width: 1920, height: 1080 }
      });
    } catch (error: any) {
      throw new Error(`Browserless connection failed: ${error.message}`);
    }
  }

  /**
   * Enhanced search with Puppeteer / Browserless
   */
  async searchYargitay(query: string, options?: ScrapingOptions): Promise<YargitayResult[]> {
    const opts = {
      maxResults: options?.maxResults || config.scraping.maxResults,
      parallelRequests: options?.parallelRequests || config.scraping.parallelRequests
    };

    console.log(`>>> Browserless ile arama başlatılıyor: "${query}" (max: ${opts.maxResults})`);

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await this.connectBrowser();
      page = await browser.newPage();

      // Step 1: Search
      console.log('>>> Yargıtay sayfasına gidiliyor...');
      await page.goto("https://karararama.yargitay.gov.tr/", {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('>>> Arama formu dolduruluyor...');
      await page.waitForSelector('#aranan');
      await page.type('#aranan', query);
      await page.click('#aramaG');

      console.log('>>> Sonuçlar bekleniyor...');
      try {
        await page.waitForSelector('#detayAramaSonuclar tbody tr', { timeout: 15000 });
      } catch (e) {
        // Check for "No Results" message
        const bodyText = await page.evaluate(() => document.body.textContent || '');
        if (bodyText.includes('Sonuç bulunamadı') || bodyText.includes('sonuç bulunamadı')) {
          throw new Error('Arama sonucu bulunamadı');
        }
        throw new Error('Sonuç tablosu yüklenemedi (Timeout)');
      }

      // Extract rows
      const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('#detayAramaSonuclar tbody tr'));
        return trs.map(tr => {
          const cells = tr.querySelectorAll('td');
          return {
            siraNo: cells[0]?.textContent?.trim() || '',
            daire: cells[1]?.textContent?.trim() || '',
            esas: cells[2]?.textContent?.trim() || '',
            karar: cells[3]?.textContent?.trim() || '',
            tarih: cells[4]?.textContent?.trim() || ''
          };
        });
      });

      if (rows.length === 0) {
        throw new Error('Tabloda sonuç bulunamadı');
      }

      const maxToFetch = Math.min(opts.maxResults, rows.length);
      console.log(`>>> ${rows.length} sonuç bulundu, ${maxToFetch} tanesi işlenecek`);

      const results: YargitayResult[] = [];

      // Process details using the same page context to Click -> Read -> Close Modal -> Repeat?
      // Or safer: Parallel pages. Since we are on Browserless, parallel pages are cheap.

      const batches = [];
      for (let i = 0; i < maxToFetch; i += opts.parallelRequests) {
        batches.push(rows.slice(i, i + opts.parallelRequests).map((row, idx) => ({ ...row, originalIndex: i + idx })));
      }

      for (const batch of batches) {
        console.log(`>>> Batch işleniyor (${batch.length} adet)...`);

        const promises = batch.map(async (rowItem) => {
          let detailPage: Page | null = null;
          try {
            detailPage = await browser!.newPage();
            // We need to re-execute search on each page? No, that's inefficient.
            // Alternatively, clicking the row on the main page opens a modal.
            // Puppeteer handling modals on the *same* page in parallel is impossible (race conditions).
            // So we MUST process sequentially on the main page OR re-search on parallel pages.
            // Re-searching is slow.

            // Better approach for speed: 
            // 1. Just click sequentially on the main page and scrape the modal. 
            // It's fast since content is usually loaded via AJAX.

            // LET'S SWITCH TO SEQUENTIAL SCRAPING ON MAIN PAGE for reliability, 
            // unless we want to use multiple contexts.
            // Given the modal nature, sequential on one page is safest.
            // But we can open multiple TABS of the search result if we can replicate state.
            // Yargitay site maintains state? Unsure.

            // Let's stick to simple sequential iteration on the main page for now. 
            // It's robust. If slow, we'll optimize later.
            return null; // Placeholder to break flow for redesign
          } catch (e) {
            return null;
          } finally {
            if (detailPage) await detailPage.close();
          }
        });
      }

      // RE-STRATEGY: Sequential scrape on single page to interact with Modals
      for (let i = 0; i < maxToFetch; i++) {
        const row = rows[i];
        console.log(`>>> Detay ${i + 1}/${maxToFetch} alınıyor: ${row.esas}`);

        try {
          // Click row to open modal
          // We need to find the element again because DOM might have refreshed? 
          // Usually safe if we didn't navigate away.
          await page.evaluate((index) => {
            const trs = document.querySelectorAll('#detayAramaSonuclar tbody tr');
            if (trs[index]) (trs[index] as HTMLElement).click();
          }, i);

          // Wait for modal content
          await page.waitForSelector('.card-scroll', { timeout: 5000 });

          // Helper to wait for text content
          await page.waitForFunction(
            () => {
              const el = document.querySelector('.card-scroll');
              return el && el.textContent && el.textContent.length > 20;
            },
            { timeout: 5000 }
          );

          // Extract content
          const icerik = await page.evaluate(() => {
            const el = document.querySelector('.card-scroll');
            return el ? el.textContent?.trim() || '' : '';
          });

          // Clean content using processor
          const cleanedContent = contentProcessor.cleanHtml(icerik);

          results.push({
            ...row,
            icerik: cleanedContent
          });

          // Close modal (if there is a close button, or clicking outside)
          // Usually clicking another row replaces content? Or strictly need to close?
          // Let's try clicking the "Kapat" button if it exists, or just next row click works?
          // Assuming clicking next row works, but to be safe, let's close if modal covers.
          // Check for close button
          const closeBtn = await page.$('.modal-footer .btn-secondary'); // generic bootstrap close
          if (closeBtn) {
            await closeBtn.click();
            await new Promise(r => setTimeout(r, 500)); // Animation wait
          }

        } catch (err: any) {
          console.error(`>>> ${i + 1}. detay hatası:`, err.message);
          // Push result without content or skip?
          results.push({ ...row, icerik: 'İçerik alınamadı' });
        }
      }

      return results;

    } catch (error: any) {
      console.error('Browserless scraping error:', error);
      throw error;
    } finally {
      if (page) await page.close().catch(() => { });
      if (browser) await browser.close().catch(() => { }); // Disconnect
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const browser = await this.connectBrowser();
      await browser.close();
      return true;
    } catch (error) {
      console.error('Browserless health check failed:', error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      url: config.browserless.url,
      hasToken: Boolean(config.browserless.token),
      mode: 'websocket'
    };
  }
}

export const browserlessService = new BrowserlessService();
