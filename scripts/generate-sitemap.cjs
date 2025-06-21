const fs = require('fs');
const path = require('path');

// Mock data for build time - replace with actual data fetching in production
const mockData = {
  countries: [
    { slug: 'italy', updated_at: '2024-01-15T10:00:00Z' },
    { slug: 'greece', updated_at: '2024-01-14T10:00:00Z' },
    { slug: 'maldives', updated_at: '2024-01-13T10:00:00Z' },
    { slug: 'bali', updated_at: '2024-01-12T10:00:00Z' },
    { slug: 'japan', updated_at: '2024-01-11T10:00:00Z' }
  ],
  tours: [
    { slug: 'romantic-italy-escape', updated_at: '2024-01-15T10:00:00Z' },
    { slug: 'greek-islands-honeymoon', updated_at: '2024-01-14T10:00:00Z' },
    { slug: 'maldives-luxury-retreat', updated_at: '2024-01-13T10:00:00Z' },
    { slug: 'bali-cultural-romance', updated_at: '2024-01-12T10:00:00Z' },
    { slug: 'japan-cherry-blossom', updated_at: '2024-01-11T10:00:00Z' }
  ],
  collections: [
    { slug: 'beach-escapes', updated_at: '2024-01-10T10:00:00Z' },
    { slug: 'cultural-adventures', updated_at: '2024-01-09T10:00:00Z' },
    { slug: 'luxury-retreats', updated_at: '2024-01-08T10:00:00Z' }
  ]
};

// Mock Supabase client for build time
const supabase = {
  from: (table) => ({
    select: () => ({
      order: () => Promise.resolve({ data: mockData[table] || [], error: null })
    })
  })
};

const SITE_URL = 'https://gomoons.com';

// Static routes with their priorities and change frequencies
const staticRoutes = [
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
async function getDestinationUrls() {
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
      changefreq: 'weekly',
      priority: 0.8
    }));
  } catch (error) {
    console.error('Error generating destination URLs:', error);
    return [];
  }
}

// Generate sitemap for all tours
async function getTourUrls() {
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
      changefreq: 'weekly',
      priority: 0.7
    }));
  } catch (error) {
    console.error('Error generating tour URLs:', error);
    return [];
  }
}

// Generate sitemap for all collections
async function getCollectionUrls() {
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
      changefreq: 'monthly',
      priority: 0.6
    }));
  } catch (error) {
    console.error('Error generating collection URLs:', error);
    return [];
  }
}

// Generate complete sitemap XML
async function generateSitemap() {
  try {
    console.log('Generating sitemap...');
    
    // Fetch all dynamic URLs
    const [destinationUrls, tourUrls, collectionUrls] = await Promise.all([
      getDestinationUrls(),
      getTourUrls(),
      getCollectionUrls()
    ]);

    console.log(`Found ${destinationUrls.length} destinations, ${tourUrls.length} tours, ${collectionUrls.length} collections`);

    // Combine all URLs
    const allUrls = [
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

// Main execution
async function main() {
  try {
    const sitemapXml = await generateSitemap();
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write sitemap.xml
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapXml);
    
    console.log(`✅ Sitemap generated successfully at ${sitemapPath}`);
    console.log(`📊 Total URLs: ${sitemapXml.split('<url>').length - 1}`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateSitemap }; 