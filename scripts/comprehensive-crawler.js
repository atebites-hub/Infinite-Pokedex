#!/usr/bin/env node

/**
 * Comprehensive Pokémon Web Crawler
 *
 * Crawls entire websites and forums to find and index all content
 * related to specific Pokémon, creating a proper RAG dataset.
 *
 * @fileoverview Comprehensive web crawler for RAG data collection
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Comprehensive Pokémon Web Crawler
 */
class ComprehensiveCrawler {
  constructor() {
    this.visitedUrls = new Set();
    this.pokemonKeywords = [
      'bulbasaur',
      'ivysaur',
      'venusaur',
      'charmander',
      'charmeleon',
      'charizard',
      'squirtle',
      'wartortle',
      'blastoise',
      'caterpie',
      'metapod',
      'butterfree',
      // Add more Pokémon names as needed
    ];

    this.forumKeywords = [
      'pokemon',
      'pokémon',
      'competitive',
      'tier',
      'strategy',
      'moveset',
      'analysis',
      'discussion',
      'thread',
      'guide',
      'how to',
      'best',
      'counters',
      'weakness',
      'strength',
      'lore',
      'story',
      'myth',
      'legend',
      'evolve',
      'evolution',
      'ability',
      'move',
      'type',
    ];

    this.results = {
      metadata: {
        crawlStart: new Date().toISOString(),
        sitesCrawled: [],
        totalPages: 0,
        relevantPages: 0,
        totalContentLength: 0,
      },
      pages: [],
    };

    this.browser = null;
  }

  /**
   * Initialize browser for JavaScript-heavy sites
   */
  async initializeBrowser() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });
  }

  /**
   * Check if URL contains Pokémon-related content
   */
  isPokemonRelated(url, title = '', content = '') {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Check if URL or title contains Pokémon names
    const hasPokemonName = this.pokemonKeywords.some(
      (keyword) => urlLower.includes(keyword) || titleLower.includes(keyword)
    );

    // Check if content contains forum keywords
    const hasForumContent = this.forumKeywords.some((keyword) =>
      contentLower.includes(keyword)
    );

    return hasPokemonName || hasForumContent;
  }

  /**
   * Extract text content from HTML
   */
  extractContent($) {
    // Remove script and style elements
    $(
      'script, style, nav, header, footer, aside, .ad, .advertisement'
    ).remove();

    // Extract main content areas
    const contentSelectors = [
      'main',
      '.content',
      '.post-content',
      '.thread-content',
      '.forum-post',
      '.article-body',
      '.entry-content',
      '#content',
      '.main-content',
      'article',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 100) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body text
    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    return content.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  /**
   * Extract links from page
   */
  extractLinks($, baseUrl) {
    const links = new Set();

    $('a[href]').each((i, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          // Only include links from the same domain
          if (absoluteUrl.startsWith(baseUrl)) {
            links.add(absoluteUrl);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    return Array.from(links);
  }

  /**
   * Crawl a single URL
   */
  async crawlUrl(url, maxDepth = 2, currentDepth = 0) {
    if (this.visitedUrls.has(url) || currentDepth > maxDepth) {
      return null;
    }

    this.visitedUrls.add(url);
    this.results.metadata.totalPages++;

    console.log(`📄 [${currentDepth}/${maxDepth}] Crawling: ${url}`);

    try {
      // Use Puppeteer for JavaScript-heavy sites, axios for simple sites
      let html, title;

      if (
        url.includes('smogon.com') ||
        url.includes('forum') ||
        url.includes('reddit')
      ) {
        // Use browser for dynamic content
        const page = await this.browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
        await page.setViewport({ width: 1366, height: 768 });

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          html = await page.content();
          title = await page.title();
        } catch (error) {
          console.log(`  ❌ Browser error: ${error.message}`);
          await page.close();
          return null;
        }

        await page.close();
      } else {
        // Use axios for simple sites
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });
        html = response.data;
        const $ = cheerio.load(html);
        title = $('title').text().trim();
      }

      const $ = cheerio.load(html);
      const content = this.extractContent($);
      const links = this.extractLinks($, url);

      const pageData = {
        url,
        title: title || 'No Title',
        content,
        contentLength: content.length,
        linksFound: links.length,
        depth: currentDepth,
        crawledAt: new Date().toISOString(),
        isRelevant: this.isPokemonRelated(url, title, content),
      };

      if (pageData.isRelevant) {
        this.results.metadata.relevantPages++;
        this.results.metadata.totalContentLength += content.length;
        this.results.pages.push(pageData);
        console.log(`  ✅ Relevant content found (${content.length} chars)`);
      } else {
        console.log(`  ⏭️  Not relevant, skipping`);
      }

      // Recursively crawl links if within depth limit
      if (currentDepth < maxDepth) {
        for (const link of links.slice(0, 5)) {
          // Limit links per page
          if (!this.visitedUrls.has(link)) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting
            await this.crawlUrl(link, maxDepth, currentDepth + 1);
          }
        }
      }

      return pageData;
    } catch (error) {
      console.log(`  ❌ Error crawling ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Crawl Bulbapedia
   */
  async crawlBulbapedia(pokemonName) {
    console.log(`\n🌱 Starting Bulbapedia crawl for ${pokemonName}`);

    const baseUrl = 'https://bulbapedia.bulbagarden.net';
    const startUrls = [
      `${baseUrl}/wiki/${pokemonName}`,
      `${baseUrl}/wiki/${pokemonName}_(Pok%C3%A9mon)`,
      `${baseUrl}/wiki/Special:Search?search=${pokemonName}`,
    ];

    for (const url of startUrls) {
      await this.crawlUrl(url, 3);
    }

    this.results.metadata.sitesCrawled.push('bulbapedia');
  }

  /**
   * Crawl Serebii
   */
  async crawlSerebii(pokemonName) {
    console.log(`\n💧 Starting Serebii crawl for ${pokemonName}`);

    const baseUrl = 'https://www.serebii.net';
    const startUrls = [
      `${baseUrl}/pokemon/${pokemonName}/`,
      `${baseUrl}/pokedex/${pokemonName}/`,
      `${baseUrl}/pokemon/${pokemonName}.shtml`,
    ];

    for (const url of startUrls) {
      await this.crawlUrl(url, 3);
    }

    this.results.metadata.sitesCrawled.push('serebii');
  }

  /**
   * Crawl Smogon (Strategy + Forums)
   */
  async crawlSmogon(pokemonName) {
    console.log(`\n🎯 Starting Smogon crawl for ${pokemonName}`);

    const baseUrl = 'https://www.smogon.com';
    const startUrls = [
      `${baseUrl}/dex/sv/pokemon/${pokemonName}`,
      `${baseUrl}/dex/ss/pokemon/${pokemonName}`,
      `${baseUrl}/dex/sm/pokemon/${pokemonName}`,
      `${baseUrl}/dex/xy/pokemon/${pokemonName}`,
      `${baseUrl}/dex/bw/pokemon/${pokemonName}`,
      `${baseUrl}/dex/dp/pokemon/${pokemonName}`,
      `${baseUrl}/dex/rs/pokemon/${pokemonName}`,
      `${baseUrl}/dex/gs/pokemon/${pokemonName}`,
      `${baseUrl}/dex/rb/pokemon/${pokemonName}`,
      `${baseUrl}/for/`,
    ];

    for (const url of startUrls) {
      await this.crawlUrl(url, 4); // Deeper crawl for forums
    }

    this.results.metadata.sitesCrawled.push('smogon');
  }

  /**
   * Crawl Reddit for Pokémon discussions
   */
  async crawlReddit(pokemonName) {
    console.log(`\n🟠 Starting Reddit crawl for ${pokemonName}`);

    const subreddits = [
      'pokemon',
      'pokemongo',
      'pokemontrades',
      'pokemonrng',
      'compokemon',
    ];
    const startUrls = subreddits.map(
      (sub) =>
        `https://www.reddit.com/r/${sub}/search/?q=${pokemonName}&type=link&sort=relevance`
    );

    for (const url of startUrls) {
      await this.crawlUrl(url, 2);
    }

    this.results.metadata.sitesCrawled.push('reddit');
  }

  /**
   * Export results to CSV
   */
  async exportToCSV(filename = 'comprehensive-crawl-results.csv') {
    const csvRows = [];

    // Header
    csvRows.push(
      [
        'URL',
        'Title',
        'Content Length',
        'Depth',
        'Crawled At',
        'Is Relevant',
        'Content Preview',
      ]
        .map((field) => `"${field}"`)
        .join(',')
    );

    // Data rows
    for (const page of this.results.pages) {
      const preview = page.content.substring(0, 200).replace(/"/g, '""');
      csvRows.push(
        [
          page.url,
          page.title.replace(/"/g, '""'),
          page.contentLength,
          page.depth,
          page.crawledAt,
          page.isRelevant,
          `"${preview}..."`,
        ].join(',')
      );
    }

    await fs.writeFile(
      join(process.cwd(), filename),
      csvRows.join('\n'),
      'utf8'
    );
    console.log(`📊 Results exported to ${filename}`);
  }

  /**
   * Export summary
   */
  async exportSummary(filename = 'comprehensive-crawl-summary.json') {
    this.results.metadata.crawlEnd = new Date().toISOString();
    this.results.metadata.duration =
      new Date(this.results.metadata.crawlEnd) -
      new Date(this.results.metadata.crawlStart);

    await fs.writeFile(
      join(process.cwd(), filename),
      JSON.stringify(this.results.metadata, null, 2),
      'utf8'
    );
    console.log(`📈 Summary exported to ${filename}`);
  }

  /**
   * Run comprehensive crawl
   */
  async runComprehensiveCrawl(pokemonName) {
    console.log(`🚀 Starting comprehensive crawl for ${pokemonName}`);
    console.log(
      'This will crawl entire websites and forums for relevant content...\n'
    );

    await this.initializeBrowser();

    try {
      // Crawl all sources
      await this.crawlBulbapedia(pokemonName);
      await this.crawlSerebii(pokemonName);
      await this.crawlSmogon(pokemonName);
      await this.crawlReddit(pokemonName);

      // Export results
      await this.exportToCSV();
      await this.exportSummary();

      console.log('\n✅ Comprehensive crawl complete!');
      console.log(
        `📊 Found ${this.results.metadata.relevantPages} relevant pages`
      );
      console.log(
        `📝 Total content: ${this.results.metadata.totalContentLength} characters`
      );
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    return this.results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/comprehensive-crawler.js <pokemon-name>');
    console.log('Example: node scripts/comprehensive-crawler.js bulbasaur');
    console.log('');
    console.log(
      'This will crawl entire websites and forums for Pokémon-related content.'
    );
    process.exit(1);
  }

  const pokemonName = args[0].toLowerCase();
  const crawler = new ComprehensiveCrawler();

  try {
    await crawler.runComprehensiveCrawl(pokemonName);
  } catch (error) {
    console.error('❌ Crawl failed:', error);
    process.exit(1);
  }
}

main();
