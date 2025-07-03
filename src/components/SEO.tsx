import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  isDestination?: boolean;
  countryName?: string;
  regionName?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonicalUrl,
  isDestination = false,
  countryName,
  regionName,
}) => {
  const defaultTitle = 'Moons - Curated Luxury Honeymoons';
  const siteName = 'Moons';
  const defaultDescription = 'Plan your dream honeymoon with Moons. We offer curated luxury travel packages and a bespoke AI-powered planner for unforgettable romantic getaways.';
  const defaultKeywords = 'Honeymoon Planning, Travel Agency for Honeymoons, Luxury Honeymoons, Romantic Getaways, Bespoke Travel, Honeymoons in Italy, Honeymoons in Amalfi Coast, Premium Honeymoon Packages';
  const defaultOgImage = 'https://cdn.cosmos.so/4eeb18b7-1baa-442e-a603-ab5ca2ba4689?format=jpeg';
  const siteUrl = 'https://www.gomoons.com';

  const generateDestinationKeywords = (country: string, region?: string) => {
    const baseKeywords = [
      `Honeymoon in ${country}`,
      `${country} Honeymoon`,
      `${country} Honeymoon Packages`,
      `Luxury Honeymoon ${country}`,
      `${country} Romantic Getaway`,
      `${country} Honeymoon Planning`,
      `Best Honeymoon Destinations ${country}`,
      `${country} Travel for Couples`,
      `${country} Honeymoon Ideas`,
      `${country} Luxury Travel`
    ];

    if (region) {
      baseKeywords.push(
        `${region} Honeymoon`,
        `${region} Romantic Travel`,
        `${country} ${region} Honeymoon`
      );
    }

    return baseKeywords.join(', ');
  };

  const generateDestinationTitle = (country: string) => {
    return `Honeymoon in ${country} | Luxury ${country} Honeymoon Packages`;
  };

  const generateDestinationDescription = (country: string, customDescription?: string) => {
    if (customDescription) {
      return customDescription;
    }
    return `Plan your dream honeymoon in ${country} with Moons. Discover luxury ${country} honeymoon packages, romantic getaways, and bespoke travel experiences. Expert planning for unforgettable ${country} honeymoons.`;
  };

  const seo = {
    title: isDestination && countryName 
      ? generateDestinationTitle(countryName)
      : (title ? `${title} | ${siteName}` : defaultTitle),
    description: isDestination && countryName
      ? generateDestinationDescription(countryName, description)
      : (description || defaultDescription),
    keywords: isDestination && countryName
      ? generateDestinationKeywords(countryName, regionName)
      : (keywords || defaultKeywords),
    ogTitle: ogTitle || (isDestination && countryName 
      ? generateDestinationTitle(countryName)
      : (title ? `${title} | ${siteName}` : defaultTitle)),
    ogDescription: ogDescription || (isDestination && countryName
      ? generateDestinationDescription(countryName, description)
      : (description || defaultDescription)),
    ogImage: ogImage || defaultOgImage,
    ogUrl: ogUrl || siteUrl,
    twitterCard: twitterCard || 'summary_large_image',
    twitterTitle: twitterTitle || (isDestination && countryName 
      ? generateDestinationTitle(countryName)
      : (title ? `${title} | ${siteName}` : defaultTitle)),
    twitterDescription: twitterDescription || (isDestination && countryName
      ? generateDestinationDescription(countryName, description)
      : (description || defaultDescription)),
    twitterImage: twitterImage || ogImage || defaultOgImage,
    canonicalUrl: canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl,
  };

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      {seo.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
      
      {isDestination && countryName && (
        <>
          <meta name="geo.region" content={countryName} />
          <meta name="geo.placename" content={countryName} />
          <meta name="DC.subject" content={`Honeymoon in ${countryName}`} />
          <meta name="article:section" content="Travel" />
          <meta name="article:tag" content={`${countryName} Honeymoon`} />
        </>
      )}
      
      <meta property="og:type" content="website" />
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      <meta property="og:image" content={seo.ogImage} />
      <meta property="og:url" content={seo.ogUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content={seo.twitterCard} />
      <meta name="twitter:title" content={seo.twitterTitle} />
      <meta name="twitter:description" content={seo.twitterDescription} />
      <meta name="twitter:image" content={seo.twitterImage} />
      
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
};

export default SEO;

// Example for planner page metadata
export const PlannerMetadata = () => {
  return (
    <>
      <title>AI Honeymoon Planner | MOONS Luxury Honeymoons</title>
      <meta name="description" content="Plan your perfect honeymoon with our AI-powered travel planner. Get personalized itineraries based on your preferences." />
      {/* Other meta tags */}
    </>
  );
}; 