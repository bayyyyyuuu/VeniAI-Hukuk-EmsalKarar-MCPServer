import * as cheerio from 'cheerio';

export class ContentProcessor {
    /**
     * Clean HTML content and extract text
     */
    cleanHtml(html: string): string {
        if (!html) return '';

        // Load into cheerio
        const $ = cheerio.load(html);

        // Remove unwanted elements
        $('script').remove();
        $('style').remove();
        $('iframe').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();
        $('.ad').remove();
        $('.advertisement').remove();

        // Get text
        let text = $('body').text() || $.text();

        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    /**
     * Highlight keywords in text (markdown bold)
     */
    highlightKeywords(text: string, query: string): string {
        if (!text || !query) return text;

        const words = query.split(/\s+/).filter(w => w.length > 2);
        let highlighted = text;

        for (const word of words) {
            // Case insensitive replacement
            const regex = new RegExp(`(${word})`, 'gi');
            highlighted = highlighted.replace(regex, '**$1**');
        }

        return highlighted;
    }

    /**
     * Extract basic metadata if possible (simple regex)
     */
    extractMetadata(text: string): Record<string, string> {
        const metadata: Record<string, string> = {};

        // Try to find Esas No
        const esasMatch = text.match(/Esas\s*No\s*:\s*(\d+\/\d+)/i);
        if (esasMatch) metadata.esasNo = esasMatch[1];

        // Try to find Karar No
        const kararMatch = text.match(/Karar\s*No\s*:\s*(\d+\/\d+)/i);
        if (kararMatch) metadata.kararNo = kararMatch[1];

        // Try to find Date
        const dateMatch = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
        if (dateMatch) metadata.date = dateMatch[1];

        return metadata;
    }

    /**
     * Truncate text intelligently
     */
    truncate(text: string, maxLength: number = 1000): string {
        if (text.length <= maxLength) return text;

        // Cut at max length
        let truncated = text.substring(0, maxLength);

        // Try to cut at the last sentence end
        const lastDot = truncated.lastIndexOf('.');
        if (lastDot > maxLength * 0.8) {
            truncated = truncated.substring(0, lastDot + 1);
        }

        return truncated + '...';
    }
}

export const contentProcessor = new ContentProcessor();
