#!/usr/bin/env node
// WP -> Webflow blog import builder for Eltex ES.
//
// Workflow:
//   node import.mjs --fetch
//   node import.mjs --batch 1 --limit 1
//   node import.mjs --batch 2 --limit 10 --offset 1
//
// Each batch JSON is ready to push via the Webflow MCP create_collection_items action.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WP_BASE = 'https://eltex.es/wp-json/wp/v2';

const args = parseArgs(process.argv.slice(2));

if (args.fetch) await fetchAndCacheAllEsPosts();
if (args.batch !== undefined) await buildBatch(args);
if (!args.fetch && args.batch === undefined) printHelp();

// ───────────────────────────── fetch & cache ─────────────────────────────

async function fetchAndCacheAllEsPosts() {
  const allCats = JSON.parse(await readFile('all-categories.json'));
  const esCats = JSON.parse(await readFile('es-categories.json'));
  const esCatIds = new Set(esCats.map((c) => c.id));
  const caCatIds = new Set(allCats.filter((c) => !esCatIds.has(c.id)).map((c) => c.id));

  const all = [];
  let page = 1;
  while (true) {
    const url = `${WP_BASE}/posts?per_page=100&page=${page}&_embed&orderby=date&order=asc`;
    const res = await fetch(url);
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  const esPosts = all.filter((p) => !p.categories.some((id) => caCatIds.has(id)));

  await fs.mkdir(path.join(__dirname, 'cache'), { recursive: true });
  await fs.writeFile(
    path.join(__dirname, 'cache', 'all-es-posts.json'),
    JSON.stringify(esPosts, null, 2),
  );
  console.log(`Cached ${esPosts.length} ES posts (out of ${all.length} total).`);
  console.log(`Skipped ${all.length - esPosts.length} Catalan posts.`);
}

// ───────────────────────────── batch builder ─────────────────────────────

async function buildBatch({ batch, limit, offset = 0 }) {
  const mappings = JSON.parse(await readFile('webflow-mappings.json'));
  const allEs = JSON.parse(await readFile('cache/all-es-posts.json'));

  if (offset >= allEs.length) {
    console.error(`Offset ${offset} is past the end of ${allEs.length} posts.`);
    process.exit(1);
  }
  const slice = allEs.slice(offset, offset + limit);

  // Catch Catalan-content posts that slipped through category filtering.
  // Detect on the CLEANED body so we don't trip on Catalan titles surfaced by
  // WP's related-posts widget at the bottom (which the cleaner strips).
  const skipped = [];
  const filtered = [];
  for (const p of slice) {
    const cleaned = cleanWpHtml(p.content.rendered);
    const sample = stripHtml(p.title.rendered + ' ' + cleaned).slice(0, 4000);
    if (isCatalan(sample)) {
      skipped.push({ slug: p.slug, title: p.title.rendered, link: p.link, id: p.id });
    } else {
      filtered.push(p);
    }
  }
  if (skipped.length) {
    console.log(`⚠  Skipped ${skipped.length} Catalan-content post(s):`);
    for (const s of skipped) console.log(`   - ${s.slug}`);
    const caFile = path.join(__dirname, 'catalan-posts.json');
    const existing = JSON.parse(await fs.readFile(caFile, 'utf-8'));
    const existingIds = new Set(existing.map((p) => p.id));
    const newOnes = skipped.filter((s) => !existingIds.has(s.id));
    if (newOnes.length) {
      await fs.writeFile(caFile, JSON.stringify([...existing, ...newOnes], null, 2));
      console.log(`   added ${newOnes.length} to catalan-posts.json`);
    }
    console.log('');
  }

  const items = filtered.map((p) => transformPost(p, mappings));

  const batchDir = path.join(__dirname, 'batches');
  await fs.mkdir(batchDir, { recursive: true });
  const batchPath = path.join(batchDir, `batch-${String(batch).padStart(3, '0')}.json`);
  await fs.writeFile(
    batchPath,
    JSON.stringify({ batch, limit, offset, count: items.length, items }, null, 2),
  );

  console.log(`Wrote ${items.length} item(s) to ${path.relative(process.cwd(), batchPath)}`);
  console.log('');
  console.log('First item summary:');
  console.log('-------------------');
  const first = items[0];
  console.log(`name:           ${first.name}`);
  console.log(`slug:           ${first.slug}`);
  console.log(`category:       ${first.category}`);
  console.log(`author-2:       ${first['author-2']}`);
  console.log(`published-date: ${first['published-date']}`);
  console.log(`updated-date:   ${first['updated-date']}`);
  console.log(`reading-time:   ${first['reading-time']}`);
  console.log(`main-image:     ${first['main-image'] ? first['main-image'].url : 'NONE'}`);
  console.log(`image-alt:      ${first['image-alt']}`);
  console.log(`seo-title:      ${first['seo-title']}`);
  console.log(`seo-desc:       ${first['seo-description']}`);
  console.log(`excerpt:        ${first.excerpt}`);
  console.log(`intro:          ${first.intro}`);
  console.log(`body chars:     ${(first['post-body'] || '').length}`);
  console.log(`body preview:   ${(first['post-body'] || '').slice(0, 400).replace(/\n/g, ' ')}`);
}

// ───────────────────────────── transform ─────────────────────────────

function transformPost(post, mappings) {
  const fm = post._embedded?.['wp:featuredmedia']?.[0];
  const wpCatSlug = post._embedded?.['wp:term']?.[0]?.[0]?.slug;
  const categoryId =
    mappings.categoriesBySlug[wpCatSlug] || mappings.categoriesBySlug['sin-categorizar'];
  const authorId = mappings.authorsBySlug['equipo-eltex'];
  const yoast = post.yoast_head_json || {};

  const cleanedBody = cleanWpHtml(post.content.rendered);
  const intro = firstParagraphText(cleanedBody, 280);
  const derivedExcerpt = firstParagraphText(cleanedBody, 155);
  const wpExcerpt = decodeEntities(stripHtml(post.excerpt.rendered)).trim();
  const excerpt = (wpExcerpt && !looksLikeBadAutoExcerpt(wpExcerpt, post.title.rendered))
    ? wpExcerpt.slice(0, 155)
    : derivedExcerpt;

  const yoastDesc = decodeEntities(yoast.description || '').trim();
  const seoDescription = pickSeoDescription(yoastDesc, derivedExcerpt);

  const readingTime = Math.max(1, Math.round(wordCount(cleanedBody) / 200));
  const image = pickFeaturedImage(fm, cleanedBody);

  return {
    name: decodeEntities(post.title.rendered),
    slug: post.slug,
    'post-body': cleanedBody,
    excerpt,
    intro,
    'main-image': image,
    'thumbnail-image': image,
    'image-alt': fm?.alt_text || '',
    category: categoryId,
    'author-2': authorId,
    'published-date': post.date,
    'updated-date': post.modified,
    'seo-title': decodeEntities(yoast.title || post.title.rendered),
    'seo-description': seoDescription,
    'original-wp-url': post.link,
    'reading-time': readingTime,
    featured: false,
  };
}

// ───────────────────────────── HTML cleaning ─────────────────────────────

function cleanWpHtml(html) {
  if (!html) return '';
  const isElementor = html.includes('elementor-widget');
  const extracted = isElementor ? extractElementor(html) : extractPlain(html);
  return stripLeadingMetadata(finalCleanup(extracted));
}

// Strip leading paragraphs that are inline metadata (author/date) or short
// CTA-only links at the very top of the post body.
function stripLeadingMetadata(html) {
  if (!html) return '';
  const patterns = [
    /^<p>\s*(Autor[ae]?\s*:|Fecha de publicaci[oó]n\s*:|Publicado\s*:|Por\s+[A-Z]).*?<\/p>\s*/i,
    /^<p>\s*<a [^>]+>[^<]{1,60}<\/a>\s*<\/p>\s*/i,
  ];
  let prev;
  let out = html;
  while (prev !== out) {
    prev = out;
    for (const p of patterns) out = out.replace(p, '');
  }
  return out.trim();
}

function extractElementor(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const blocks = [];
  let stopped = false;

  // Skip widgets that mark end of article body
  const STOP_WIDGETS = new Set(['posts', 'post-navigation', 'theme-post-comments', 'social-icons']);
  // Headings that are actually "related posts" markers
  const SKIP_HEADING = /otras noticias|sigue leyendo|art[ií]culos relacionados|leer m[aá]s|altres not[ií]cies/i;

  $('.elementor-widget').each((_, el) => {
    if (stopped) return;
    const $el = $(el);
    const widgetType = ($el.attr('data-widget_type') || '').split('.')[0];

    if (STOP_WIDGETS.has(widgetType)) {
      stopped = true;
      return;
    }

    if (widgetType === 'text-editor') {
      const container = $el.find('.elementor-widget-container').first();
      const inner = container.html() || $el.html();
      if (inner) blocks.push(inner);
    } else if (widgetType === 'heading') {
      const heading = $el.find('h1, h2, h3, h4, h5, h6').first();
      if (heading.length && !SKIP_HEADING.test(heading.text().trim())) {
        blocks.push($.html(heading));
      }
    } else if (widgetType === 'image') {
      const img = $el.find('img').first();
      if (img.length) blocks.push($.html(img));
    } else if (widgetType === 'button') {
      const a = $el.find('a').first();
      if (a.length) {
        const href = a.attr('href');
        const text = a.text().trim();
        if (href && text) blocks.push(`<p><a href="${href}">${escapeHtml(text)}</a></p>`);
      }
    } else if (widgetType === 'divider') {
      blocks.push('<hr/>');
    } else if (widgetType === 'video') {
      const iframe = $el.find('iframe').first();
      if (iframe.length) blocks.push($.html(iframe));
    }
    // skip: spacer, icon-list, call-to-action (usually duplicates h1), etc.
  });

  return blocks.filter(Boolean).join('\n\n');
}

function extractPlain(html) {
  // Gutenberg or plain HTML — light cleanup
  const $ = cheerio.load(html, { decodeEntities: false });
  $('.wp-block-spacer, [aria-hidden="true"]').remove();
  return $('body').html() || html;
}

function finalCleanup(html) {
  if (!html) return '';
  const $ = cheerio.load(html, { decodeEntities: false });

  $('svg, script, style').remove();

  const KEEP = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan']);
  $('*').each((_, el) => {
    if (!el.attribs) return;
    for (const name of Object.keys(el.attribs)) {
      if (!KEEP.has(name)) $(el).removeAttr(name);
    }
  });

  // Remove empty paragraphs and divs
  $('p, div').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img,iframe').length === 0) $el.remove();
  });

  // Unwrap layout-only wrappers (divs and spans without semantic value)
  $('div, span').each((_, el) => {
    $(el).replaceWith($(el).contents());
  });

  normalizeHeadings($);

  let out = $('body').html() || '';
  out = decodeEntities(out)
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return wrapOrphanText(out);
}

// Wrap top-level text or inline-only chunks in <p> so Webflow Rich Text
// renders them with proper paragraph styling.
function wrapOrphanText(html) {
  const blockStart = /^<(p|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|hr|figure|img|iframe|video|audio|section|article|aside|details|summary|nav|header|footer)\b/i;
  return html
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (blockStart.test(chunk) ? chunk : `<p>${chunk}</p>`))
    .join('\n\n');
}

// Normalize headings:
//   - Always demote H1 to H2 (page template owns the H1).
//   - Then find the highest level still used (lowest number) and shift so it becomes H2.
//   - Clamp result to H2..H4.
function normalizeHeadings($) {
  // Demote any inline H1 first (template owns H1).
  $('h1').each((_, el) => {
    const $h = $(el);
    $h.replaceWith(`<h2>${$h.html()}</h2>`);
  });

  const headings = $('h2, h3, h4, h5, h6').toArray();
  if (headings.length === 0) return;

  let highest = 6;
  for (const h of headings) {
    const lvl = parseInt(h.tagName.charAt(1), 10);
    if (lvl < highest) highest = lvl;
  }
  const shift = 2 - highest;

  for (const h of headings) {
    const oldLvl = parseInt(h.tagName.charAt(1), 10);
    let newLvl = oldLvl + shift;
    newLvl = Math.min(4, Math.max(2, newLvl));
    if (newLvl !== oldLvl) {
      const $h = $(h);
      $h.replaceWith(`<h${newLvl}>${$h.html()}</h${newLvl}>`);
    }
  }
}

// Detect Catalan content via distinctive markers absent (or rare) in Spanish.
function isCatalan(text) {
  const lower = text.toLowerCase();
  const markers = [
    /\bamb\b/, /\btambé\b/, /\bperò\b/, /\bnomés\b/, /\baquesta\b/, /\baquest\b/,
    /\bpanells\b/, /\bés\b/, /\bestà\b/, /\bdiferència\b/, /\bimportància\b/,
    /\bquè\b/, /\btots\b/, /\btotes\b/, /\baixí\b/, /\bdoncs\b/, /\bconèixer\b/,
    /\benergètica\b/, /\bhivern\b/, /\bllum\b/, /\btransició\b/,
    / s'/, / d'/, / l'/, / n'/, / m'/, / t'/,  // Catalan apostrophe contractions
  ];
  let hits = 0;
  for (const re of markers) if (re.test(lower)) hits += 1;
  return hits >= 5;
}

// Pick a featured image: prefer Yoast featured media, fall back to first inline <img>.
function pickFeaturedImage(featuredMedia, cleanedBody) {
  if (featuredMedia?.source_url) {
    return { url: featuredMedia.source_url, alt: featuredMedia.alt_text || '' };
  }
  if (!cleanedBody) return null;
  const $ = cheerio.load(cleanedBody, { decodeEntities: false });
  const img = $('img').first();
  if (!img.length) return null;
  const src = img.attr('src');
  if (!src || !/^https?:\/\//.test(src)) return null;
  return { url: src, alt: img.attr('alt') || '' };
}

// ───────────────────────────── helpers ─────────────────────────────

function firstParagraphText(html, max) {
  if (!html) return '';
  const $ = cheerio.load(html, { decodeEntities: false });
  const p = $('p').first().text().trim();
  const text = p || $.root().text().trim();
  if (text.length <= max) return text;
  // cut at last sentence boundary or word boundary
  const cut = text.slice(0, max);
  const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (lastDot > max * 0.6) return cut.slice(0, lastDot + 1).trim();
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function looksLikeBadAutoExcerpt(excerpt, title) {
  // WP auto-excerpt often starts with the post title
  const cleanTitle = stripHtml(decodeEntities(title)).trim();
  if (!cleanTitle) return false;
  const head = excerpt.slice(0, cleanTitle.length + 5);
  return head.includes(cleanTitle);
}

function pickSeoDescription(yoastDesc, fallback) {
  if (!yoastDesc) return fallback.slice(0, 160);
  // Spanish-specific markers (articles + contractions absent from Dutch/English/French)
  const spanishMarkers = yoastDesc
    .toLowerCase()
    .match(/\b(el|la|los|las|una|uno|del|para|con|que|por|al)\b/g) || [];
  if (spanishMarkers.length < 3) return fallback.slice(0, 160);
  return yoastDesc.slice(0, 160);
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function wordCount(html) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[​-‍﻿]/g, ''); // zero-width chars
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function readFile(rel) {
  return fs.readFile(path.join(__dirname, rel), 'utf-8');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--fetch') out.fetch = true;
    else if (a === '--batch') out.batch = Number(argv[++i]);
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--offset') out.offset = Number(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
WP -> Webflow blog import builder.

Usage:
  node import.mjs --fetch
      Cache all Spanish posts from eltex.es to cache/all-es-posts.json.

  node import.mjs --batch <n> --limit <m> [--offset <o>]
      Build batches/batch-<n>.json with <m> transformed items
      starting at post offset <o> (default 0).

Examples:
  node import.mjs --fetch
  node import.mjs --batch 1 --limit 1
  node import.mjs --batch 2 --limit 10 --offset 1
`);
}
