import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const SUPABASE_URL = 'https://ydcggawwxohbcpcjyhdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Current date for lastmod
const currentDate = '2025-06-21';

async function generateSitemap() {
  console.log('🗺️  Generating sitemap from database...');

  try {
    // Fetch countries from database
    console.log('📍 Fetching countries...');
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('slug, name, updated_at')
      .order('name');

    if (countriesError) {
      console.error('Error fetching countries:', countriesError);
      return;
    }

    // Fetch collections from database
    console.log('📚 Fetching collections...');
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('slug, name, updated_at')
      .order('name');

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return;
    }

    // Fetch tours from database
    console.log('🎯 Fetching tours...');
    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('slug, title, updated_at')
      .order('title');

    if (toursError) {
      console.error('Error fetching tours:', toursError);
      return;
    }

    console.log(`✅ Found ${countries?.length || 0} countries, ${collections?.length || 0} collections, ${tours?.length || 0} tours`);

    // Generate sitemap XML
    const sitemap = generateSitemapXML(countries || [], collections || [], tours || []);

    // Write to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');

    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log(`🎉 Sitemap generated successfully at ${sitemapPath}`);
    console.log(`📊 Total URLs: ${(countries?.length || 0) + (collections?.length || 0) + (tours?.length || 0) + 5} (including main pages)`);

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
  }
}

function generateSitemapXML(countries, collections, tours) {
  const baseUrl = 'https://www.gomoons.com';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/destinations</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/collections</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/planner</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;

  // Add countries (destination pages) - HIGH PRIORITY for SEO
  console.log(`Adding ${countries.length} countries to sitemap...`);
  countries.forEach(country => {
    xml += `  <url>
    <loc>${baseUrl}/destinations/${country.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
  });

  // Add collection pages
  if (collections.length > 0) {
    xml += `  
  <!-- Collection Pages -->\n`;
    
    collections.forEach(collection => {
      xml += `  <url>
    <loc>${baseUrl}/collections/${collection.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });
  }

  // Add tour pages
  if (tours.length > 0) {
    xml += `  
  <!-- Tour Pages -->\n`;
    
    tours.forEach(tour => {
      xml += `  <url>
    <loc>${baseUrl}/tours/${tour.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });
  }

  xml += `  
</urlset>`;

  return xml;
}

// Run the script
generateSitemap(); 