import puppeteer, { Browser, Page } from 'puppeteer';

class BrowserPool {
  private browsers: Browser[] = [];
  private maxBrowsers = 1; // Tek browser, daha stabil
  private queueSize = 0;
  private maxQueueSize = 10; // Daha küçük queue
  private currentIndex = 0;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log(`${this.maxBrowsers} browser başlatılıyor...`);
      for (let i = 0; i < this.maxBrowsers; i++) {
        console.log(`Browser ${i + 1}/${this.maxBrowsers} açılıyor...`);
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images'
          ],
          timeout: 60000
        });
        this.browsers.push(browser);
      }
      this.isInitialized = true;
      console.log(`${this.maxBrowsers} browser başarıyla başlatıldı!`);
    } catch (error) {
      console.error('Browser pool başlatma hatası:', error);
      throw error;
    }
  }

  async getPage(): Promise<Page | null> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.queueSize >= this.maxQueueSize) {
      console.log('Queue dolu, istek reddedildi');
      return null;
    }
    
    this.queueSize++;
    const browser = this.browsers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.maxBrowsers;
    
    try {
      const page = await browser.newPage();
      
      // Sayfa timeout'larını ayarla - daha uzun
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
      
      // Performans optimizasyonları - request interception kaldırıldı
      await page.setCacheEnabled(false);
      
      // JavaScript'i etkinleştir
      await page.setJavaScriptEnabled(true);
      
      return page;
    } catch (error) {
      console.error('Sayfa oluşturma hatası:', error);
      this.queueSize--;
      return null;
    }
  }

  async closePage(page: Page) {
    try {
      await page.close();
    } catch (error) {
      console.error('Sayfa kapatma hatası:', error);
    } finally {
      this.queueSize--;
    }
  }

  getQueueStatus() {
    return {
      queueSize: this.queueSize,
      maxQueue: this.maxQueueSize,
      isFull: this.queueSize >= this.maxQueueSize,
      isInitialized: this.isInitialized
    };
  }

  async closeAll() {
    try {
      for (const browser of this.browsers) {
        await browser.close();
      }
      this.browsers = [];
      this.isInitialized = false;
      console.log('Tüm browser\'lar kapatıldı');
    } catch (error) {
      console.error('Browser kapatma hatası:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized || this.browsers.length === 0) {
      return false;
    }
    
    try {
      const testPage = await this.browsers[0].newPage();
      await testPage.goto('https://karararama.yargitay.gov.tr/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      await testPage.close();
      return true;
    } catch (error) {
      console.error('Health check başarısız:', error);
      return false;
    }
  }
}

export const browserPool = new BrowserPool();