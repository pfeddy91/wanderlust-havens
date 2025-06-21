import React from 'react';
import { Helmet } from 'react-helmet-async';

// Base site configuration
const SITE_CONFIG = {
  siteName: 'MOONS',
  siteUrl: 'https://gomoons.com',
  defaultDescription: 'Planning honeymoon? MOONS travel agency specializes in honeymoon ideas for Italy, Japan, Greece & more. Expert honeymoon planning with luxury destinations and romantic travel packages.',
  defaultKeywords: 'planning honeymoon, travel agency honeymoon, honeymoon ideas, honeymoon in Italy, honeymoon in Japan, honeymoon in Greece, honeymoon planning, romantic travel, luxury honeymoon, honeymoon destinations',
  twitterHandle: '@moons_travel',
  brandColor: '#00395c',
  businessInfo: {
    name: 'MOONS',
    address: '83 Goswell Road, London, EC1V 7ER',
    phone: '+44 7733 952491',
    email: 'infogomoons@gmail.com'
  }
};

// SEO Component Props Interface
interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  structuredData?: any[];
  canonical?: string;
}

// Main SEO Component
export const SEO: React.FC<SEOProps> = ({
  title,
  description = SITE_CONFIG.defaultDescription,
  keywords = SITE_CONFIG.defaultKeywords,
  image = 'https://cdn.cosmos.so/8b1c4340-6566-41a7-a415-b50a67713b99?format=jpeg',
  url,
  type = 'website',
  noIndex = false,
  structuredData = [],
  canonical
}) => {
  const fullTitle = title ? `${title} | ${SITE_CONFIG.siteName}` : `${SITE_CONFIG.siteName} - Luxury Honeymoon Destinations & Bespoke Planning`;
  const fullUrl = url ? `${SITE_CONFIG.siteUrl}${url}` : SITE_CONFIG.siteUrl;
  const canonicalUrl = canonical ? `${SITE_CONFIG.siteUrl}${canonical}` : fullUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_CONFIG.siteName} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {SITE_CONFIG.twitterHandle && <meta name="twitter:site" content={SITE_CONFIG.twitterHandle} />}
      
      {/* Theme */}
      <meta name="theme-color" content={SITE_CONFIG.brandColor} />
      
      {/* Structured Data */}
      {structuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

// Specific SEO Components for Different Page Types

// Homepage SEO
export const HomepageSEO = () => {
  const structuredData = [
    // Organization Schema
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": SITE_CONFIG.siteName,
      "url": SITE_CONFIG.siteUrl,
      "logo": `${SITE_CONFIG.siteUrl}/logo.png`,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": SITE_CONFIG.businessInfo.phone,
        "contactType": "customer service",
        "email": SITE_CONFIG.businessInfo.email
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "83 Goswell Road",
        "addressLocality": "London",
        "postalCode": "EC1V 7ER",
        "addressCountry": "GB"
      },
      "sameAs": [
        "https://instagram.com/moons_travel",
        "https://twitter.com/moons_travel"
      ]
    },
    // Travel Agency Schema
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "name": SITE_CONFIG.siteName,
      "description": "Luxury honeymoon travel agency specializing in bespoke honeymoon planning and curated romantic destinations worldwide.",
      "url": SITE_CONFIG.siteUrl,
      "telephone": SITE_CONFIG.businessInfo.phone,
      "email": SITE_CONFIG.businessInfo.email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "83 Goswell Road",
        "addressLocality": "London",
        "postalCode": "EC1V 7ER",
        "addressCountry": "GB"
      }
    }
  ];

  return (
    <SEO
      title="Planning Honeymoon Made Easy | Travel Agency for Honeymoon Ideas"
      description="Planning honeymoon? MOONS travel agency specializes in honeymoon ideas for Italy, Japan, Greece & more. Expert honeymoon planning with luxury destinations and romantic travel packages."
      keywords="planning honeymoon, travel agency honeymoon, honeymoon ideas, honeymoon in Italy, honeymoon in Japan, honeymoon in Greece, honeymoon planning, romantic travel, luxury honeymoon, honeymoon destinations"
      structuredData={structuredData}
    />
  );
};

// Destination SEO
interface DestinationSEOProps {
  countryName: string;
  countrySlug: string;
  description?: string;
  image?: string;
  tours?: any[];
}

export const DestinationSEO: React.FC<DestinationSEOProps> = ({
  countryName,
  countrySlug,
  description,
  image,
  tours = []
}) => {
  const title = `Luxury Honeymoon in ${countryName} - Bespoke ${countryName} Honeymoon Packages`;
  const metaDescription = description || `Discover luxury honeymoon packages in ${countryName}. Bespoke ${countryName} honeymoon planning with curated experiences, luxury accommodations, and romantic destinations.`;
  const keywords = `honeymoon in ${countryName}, ${countryName} honeymoon, luxury ${countryName} honeymoon, ${countryName} honeymoon packages, romantic ${countryName} travel, ${countryName} honeymoon destinations`;

  const structuredData = [
    // Destination Schema
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      "name": `${countryName} Honeymoon Destination`,
      "description": metaDescription,
      "url": `${SITE_CONFIG.siteUrl}/destinations/${countrySlug}`,
      "image": image,
      "touristType": "Honeymooners",
      "includesAttraction": tours.map(tour => ({
        "@type": "TouristAttraction",
        "name": tour.title,
        "description": tour.summary
      }))
    }
  ];

  return (
    <SEO
      title={title}
      description={metaDescription}
      keywords={keywords}
      url={`/destinations/${countrySlug}`}
      image={image}
      structuredData={structuredData}
    />
  );
};

// Tour SEO
interface TourSEOProps {
  tour: {
    title: string;
    slug: string;
    summary?: string;
    description?: string;
    guide_price?: number;
    duration?: number;
    countries?: string[];
    featured_image?: string;
  };
}

export const TourSEO: React.FC<TourSEOProps> = ({ tour }) => {
  const countries = tour.countries?.join(', ') || '';
  const title = `${tour.title} - Luxury Honeymoon Package`;
  const metaDescription = tour.summary || tour.description || `Experience the luxury honeymoon of a lifetime with our ${tour.title} package. ${tour.duration} days of romantic adventures in ${countries}.`;
  const keywords = `${tour.title}, honeymoon in ${countries}, luxury honeymoon package, ${countries} honeymoon, romantic travel ${countries}`;

  const structuredData = [
    // Product Schema for Tour Package
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": tour.title,
      "description": metaDescription,
      "image": tour.featured_image,
      "brand": {
        "@type": "Brand",
        "name": SITE_CONFIG.siteName
      },
      "offers": {
        "@type": "Offer",
        "price": tour.guide_price,
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": SITE_CONFIG.siteName
        }
      },
      "category": "Honeymoon Package",
      "audience": {
        "@type": "Audience",
        "audienceType": "Honeymooners"
      }
    },
    // Tour Schema
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      "name": tour.title,
      "description": metaDescription,
      "duration": `P${tour.duration}D`,
      "touristType": "Honeymooners",
      "itinerary": {
        "@type": "ItemList",
        "name": `${tour.title} Itinerary`
      }
    }
  ];

  return (
    <SEO
      title={title}
      description={metaDescription}
      keywords={keywords}
      url={`/tours/${tour.slug}`}
      image={tour.featured_image}
      type="product"
      structuredData={structuredData}
    />
  );
};

// Collection SEO
interface CollectionSEOProps {
  collection: {
    name: string;
    slug: string;
    description?: string;
  };
  tours?: any[];
}

export const CollectionSEO: React.FC<CollectionSEOProps> = ({ collection, tours = [] }) => {
  const title = `${collection.name} - Luxury Honeymoon Collection`;
  const metaDescription = collection.description || `Explore our ${collection.name} honeymoon collection. Curated luxury honeymoon packages for unforgettable romantic experiences.`;
  const keywords = `${collection.name} honeymoon, luxury honeymoon collection, ${collection.name} travel, romantic ${collection.name} packages`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": collection.name,
      "description": metaDescription,
      "numberOfItems": tours.length,
      "itemListElement": tours.map((tour, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": tour.title,
          "description": tour.summary,
          "url": `${SITE_CONFIG.siteUrl}/tours/${tour.slug}`
        }
      }))
    }
  ];

  return (
    <SEO
      title={title}
      description={metaDescription}
      keywords={keywords}
      url={`/collections/${collection.slug}`}
      structuredData={structuredData}
    />
  );
};

// Planner SEO
export const PlannerSEO = () => (
  <SEO
    title="AI Honeymoon Planner - Bespoke Honeymoon Planning"
    description="Plan your perfect honeymoon with our AI-powered bespoke planner. Get personalized luxury honeymoon itineraries based on your preferences and travel style."
    keywords="AI honeymoon planner, bespoke honeymoon planning, personalized honeymoon, honeymoon planning tool, luxury honeymoon planner"
    url="/planner"
  />
);

// Contact SEO
export const ContactSEO = () => (
  <SEO
    title="Contact Us - Luxury Honeymoon Planning Experts"
    description="Get in touch with MOONS luxury honeymoon planning experts. Contact us for bespoke honeymoon planning, destination advice, and personalized travel services."
    keywords="contact honeymoon planner, luxury travel agency contact, honeymoon planning consultation, travel experts contact"
    url="/contact"
  />
);

// Destinations List SEO
export const DestinationsListSEO = () => (
  <SEO
    title="Honeymoon Destinations - Luxury Romantic Travel Worldwide"
    description="Explore luxury honeymoon destinations worldwide. From tropical islands to cultural cities, discover the perfect romantic destination for your honeymoon."
    keywords="honeymoon destinations, luxury honeymoon destinations, romantic travel destinations, best honeymoon locations, honeymoon travel ideas"
    url="/destinations"
  />
);

// Collections List SEO
export const CollectionsListSEO = () => (
  <SEO
    title="Honeymoon Collections - Curated Luxury Travel Experiences"
    description="Explore our curated honeymoon collections. From beach escapes to cultural adventures, find the perfect luxury honeymoon style for your romantic getaway."
    keywords="honeymoon collections, luxury honeymoon packages, romantic travel collections, curated honeymoon experiences, honeymoon travel styles"
    url="/collections"
  />
); 