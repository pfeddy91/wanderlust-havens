import { createClient } from '@supabase/supabase-js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://ydcggawwxohbcpcjyhdk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Add your anon key to environment
const supabase = createClient(supabaseUrl, supabaseKey);

// Premium luxury honeymoon images - curated for high-end travel agency
const premiumImages = [
  {
    name: 'maldives-overwater-villa',
    url: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=85',
    alt: 'Luxury overwater villa in Maldives with crystal clear waters',
    caption: 'Maldives Paradise',
    category: 'luxury-resort'
  },
  {
    name: 'bali-infinity-pool',
    url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=85',
    alt: 'Infinity pool overlooking rice terraces in Bali',
    caption: 'Bali Serenity',
    category: 'spa-wellness'
  },
  {
    name: 'santorini-sunset-terrace',
    url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=85',
    alt: 'Private terrace overlooking Santorini sunset',
    caption: 'Santorini Romance',
    category: 'romantic-sunset'
  },
  {
    name: 'dubai-luxury-suite',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=85',
    alt: 'Luxury hotel suite with panoramic city views',
    caption: 'Dubai Elegance',
    category: 'urban-luxury'
  },
  {
    name: 'tuscany-vineyard-villa',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
    alt: 'Private villa surrounded by Tuscan vineyards',
    caption: 'Tuscan Dreams',
    category: 'countryside-retreat'
  }
];

// Image variants for different screen sizes and use cases
const imageVariants = [
  { suffix: '-desktop', width: 1200, height: 800, quality: 85 },
  { suffix: '-tablet', width: 800, height: 600, quality: 82 },
  { suffix: '-mobile', width: 500, height: 375, quality: 80 },
  { suffix: '-lqip', width: 40, height: 30, quality: 20 }, // Low Quality Image Placeholder
];

// Download image from URL
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
};

// Upload image to Supabase Storage
const uploadToSupabase = async (localPath, storagePath) => {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const { data, error } = await supabase.storage
      .from('gallery-images')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        duplex: false
      });

    if (error) throw error;
    console.log(`✅ Uploaded: ${storagePath}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to upload ${storagePath}:`, error.message);
    throw error;
  }
};

// Generate optimized image URL with Supabase transformations
const getOptimizedUrl = (imageName, variant) => {
  const baseUrl = `${supabaseUrl}/storage/v1/object/public/gallery-images/${imageName}.jpg`;
  const params = new URLSearchParams({
    width: variant.width.toString(),
    height: variant.height.toString(),
    quality: variant.quality.toString(),
    format: 'webp',
    resize: 'cover'
  });
  return `${baseUrl}?${params.toString()}`;
};

// Main migration function
const migrateGalleryImages = async () => {
  console.log('🚀 Starting premium gallery image migration...\n');

  // Create temp directory
  const tempDir = path.join(__dirname, 'temp-images');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    for (const image of premiumImages) {
      console.log(`📷 Processing: ${image.name}`);
      
      // Download original image
      const tempPath = path.join(tempDir, `${image.name}.jpg`);
      await downloadImage(image.url, tempPath);
      console.log(`  ⬇️  Downloaded to temp`);

      // Upload original to Supabase
      await uploadToSupabase(tempPath, `${image.name}.jpg`);
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
    }

    // Generate optimized URLs for each variant
    console.log('\n📋 Generated optimized URLs:');
    console.log('Copy these into your updated ScrollRevealGallery component:\n');
    
    const imageConfig = premiumImages.map(image => {
      const urls = {};
      imageVariants.forEach(variant => {
        urls[variant.suffix.replace('-', '')] = getOptimizedUrl(image.name, variant);
      });
      
      return {
        name: image.name,
        alt: image.alt,
        caption: image.caption,
        category: image.category,
        urls
      };
    });

    console.log('const GALLERY_IMAGES = ', JSON.stringify(imageConfig, null, 2));

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('\n✅ Gallery image migration completed!');
  console.log('🔄 Update your ScrollRevealGallery component with the generated URLs');
  console.log('📱 Test the component on mobile and desktop for optimal performance');
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Please set SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }
  
  migrateGalleryImages().catch(console.error);
}

export { migrateGalleryImages }; 