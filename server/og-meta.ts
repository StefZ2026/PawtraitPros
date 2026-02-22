import { type Express, type Request, type Response, type NextFunction } from "express";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const SITE_NAME = "Pawtrait Pros";

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Pinterest',
  'Discordbot',
  'Nextdoor',
  'Google-InspectionTool',
  'Googlebot',
  'bingbot',
  'Applebot',
  'Embedly',
  'outbrain',
  'vkShare',
  'W3C_Validator',
  'redditbot',
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBaseUrl(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'pawtraitpros.com';
  return `${proto}://${host}`;
}

function buildOgHtml(template: string, meta: {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}): string {
  const ogTags = [
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="${meta.imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ];

  if (meta.imageUrl) {
    ogTags.push(`<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`);
    ogTags.push(`<meta property="og:image:width" content="1200" />`);
    ogTags.push(`<meta property="og:image:height" content="630" />`);
    ogTags.push(`<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`);
  }

  const titleTag = `<title>${escapeHtml(meta.title)}</title>`;
  const descTag = `<meta name="description" content="${escapeHtml(meta.description)}" />`;

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, titleTag);
  html = html.replace(/<meta name="description"[^>]*\/>/, descTag);
  html = html.replace(/<meta property="og:title"[^>]*\/>/, '');
  html = html.replace(/<meta property="og:description"[^>]*\/>/, '');
  html = html.replace('</head>', `    ${ogTags.join('\n    ')}\n  </head>`);

  return html;
}

function getHtmlTemplate(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const templatePath = isProd
    ? path.resolve(currentDir, 'public', 'index.html')
    : path.resolve(currentDir, '..', 'client', 'index.html');

  return fs.readFileSync(templatePath, 'utf-8');
}

export function setupOgMetaRoutes(app: Express) {
  app.get('/business/:slug', async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers['user-agent'];
    if (!isCrawler(ua)) return next();

    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug as string);
      if (!org || !org.isActive) return next();

      const orgDogs = await storage.getDogsByOrganization(org.id);
      const availableDogs = orgDogs.filter(d => d.isAvailable);

      const baseUrl = getBaseUrl(req);
      const ogImageUrl = `${baseUrl}/api/business/${slug}/og-image`;

      const petCount = availableDogs.length;
      const speciesSet = new Set(availableDogs.map(d => d.species));
      const species = availableDogs.length > 0
        ? Array.from(speciesSet).join(' and ')
        : 'pets';
      const description = org.description
        || `Meet ${petCount} adorable ${species} at ${org.name}! View their beautiful artistic portraits.`;

      const template = getHtmlTemplate();
      const html = buildOgHtml(template, {
        title: `${org.name} - Pet Portraits | ${SITE_NAME}`,
        description,
        imageUrl: ogImageUrl,
        url: `${baseUrl}/business/${slug}`,
      });

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      console.error("OG meta error for business:", error);
      next();
    }
  });

  app.get('/pawfile/:id', async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers['user-agent'];
    if (!isCrawler(ua)) return next();

    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return next();

      const dog = await storage.getDog(id);
      if (!dog) return next();

      const org = dog.organizationId ? await storage.getOrganization(dog.organizationId) : null;

      const baseUrl = getBaseUrl(req);
      const ogImageUrl = `${baseUrl}/api/pawfile/${id}/og-image`;

      const breedStr = dog.breed ? `${dog.breed} ` : '';
      const ageStr = dog.age ? `, ${dog.age}` : '';
      const orgStr = org ? ` at ${org.name}` : '';
      const speciesLabel = dog.species === 'cat' ? 'Cat' : 'Dog';

      const title = `${dog.name} - ${breedStr}${speciesLabel} Portrait${orgStr} | ${SITE_NAME}`;
      const description = dog.description
        || `Meet ${dog.name}, a beautiful ${breedStr}${speciesLabel.toLowerCase()}${ageStr}${orgStr}. View ${dog.name}'s stunning artistic portrait!`;

      const template = getHtmlTemplate();
      const html = buildOgHtml(template, {
        title,
        description,
        imageUrl: ogImageUrl,
        url: `${baseUrl}/pawfile/${id}`,
      });

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      console.error("OG meta error for pawfile:", error);
      next();
    }
  });
}
