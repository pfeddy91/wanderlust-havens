import { supabase } from './supabaseClient';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const SITE_URL = 'https://gomoons.com';

// Static routes with their priorities and change frequencies
const staticRoutes: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: 1.0
  },
  {
    loc: '/destinations',
    changefreq: 'weekly',
    priority: 0.9
  },
  {
    loc: '/collections',
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/planner',
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/contact',
    changefreq: 'monthly',
    priority: 0.6
  }
];

// Generate sitemap for all countries/destinations
async function getDestinationUrls(): Promise<SitemapUrl[]> {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select('slug, updated_at')
      .order('name');

    if (error) {
      console.error('Error fetching countries for sitemap:', error);
      return [];
    }

    return countries.map(country => ({
      loc: `/destinations/${country.slug}`,
      lastmod: country.updated_at ? new Date(country.updated_at).toISOString().split('T')[0] : undefined,
      changefreq: 'weekly' as const,
      priority: 0.8
    }));
  } catch (error) {
    console.error('Error generating destination URLs:', error);
    return [];
  }
}

// Generate sitemap for all tours
async function getTourUrls(): Promise<SitemapUrl[]> {
  try {
    const { data: tours, error } = await supabase
      .from('tours')
      .select('slug, updated_at')
      .order('name');

    if (error) {
      console.error('Error fetching tours for sitemap:', error);
      return [];
    }

    return tours.map(tour => ({
      loc: `/tours/${tour.slug}`,
      lastmod: tour.updated_at ? new Date(tour.updated_at).toISOString().split('T')[0] : undefined,
      changefreq: 'weekly' as const,
      priority: 0.7
    }));
  } catch (error) {
    console.error('Error generating tour URLs:', error);
    return [];
  }
}

// Generate sitemap for all collections
async function getCollectionUrls(): Promise<SitemapUrl[]> {
  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('slug, updated_at')
      .order('name');

    if (error) {
      console.error('Error fetching collections for sitemap:', error);
      return [];
    }

    return collections.map(collection => ({
      loc: `/collections/${collection.slug}`,
      lastmod: collection.updated_at ? new Date(collection.updated_at).toISOString().split('T')[0] : undefined,
      changefreq: 'monthly' as const,
      priority: 0.6
    }));
  } catch (error) {
    console.error('Error generating collection URLs:', error);
    return [];
  }
}

// Generate complete sitemap XML
export async function generateSitemap(): Promise<string> {
  try {
    // Fetch all dynamic URLs
    const [destinationUrls, tourUrls, collectionUrls] = await Promise.all([
      getDestinationUrls(),
      getTourUrls(),
      getCollectionUrls()
    ]);

    // Combine all URLs
    const allUrls: SitemapUrl[] = [
      ...staticRoutes,
      ...destinationUrls,
      ...tourUrls,
      ...collectionUrls
    ];

    // Generate XML
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const urlsetClose = '</urlset>';

    const urlEntries = allUrls.map(url => {
      let urlEntry = `  <url>\n    <loc>${SITE_URL}${url.loc}</loc>`;
      
      if (url.lastmod) {
        urlEntry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      }
      
      if (url.changefreq) {
        urlEntry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      }
      
      if (url.priority) {
        urlEntry += `\n    <priority>${url.priority}</priority>`;
      }
      
      urlEntry += '\n  </url>';
      return urlEntry;
    }).join('\n');

    return `${xmlHeader}\n${urlsetOpen}\n${urlEntries}\n${urlsetClose}`;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

// Generate robots.txt content
export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl-delay (optional - be respectful to crawlers)
Crawl-delay: 1

# Disallow admin or sensitive paths (if any)
# Disallow: /admin/
# Disallow: /api/

# Allow search engines to crawl all honeymoon-related content
Allow: /destinations/
Allow: /tours/
Allow: /collections/
Allow: /planner/
Allow: /contact/`;
}

// Utility to save sitemap (for build processes or manual generation)
export async function saveSitemap(): Promise<void> {
  try {
    const sitemapXml = await generateSitemap();
    const robotsTxt = generateRobotsTxt();
    
    // In a real application, you would save these to your public directory
    // For now, we'll log them or you can implement file writing
    console.log('Generated sitemap.xml:');
    console.log(sitemapXml);
    console.log('\nGenerated robots.txt:');
    console.log(robotsTxt);
    
    // Example of how you might save in a Node.js environment:
    // import fs from 'fs';
    // fs.writeFileSync('public/sitemap.xml', sitemapXml);
    // fs.writeFileSync('public/robots.txt', robotsTxt);
  } catch (error) {
    console.error('Error saving sitemap:', error);
    throw error;
  }
} 