/**
 * Standardized Typography System for Moons Honeymoon Travel Agency
 * Mobile-first responsive typography using serif typeface only
 */

export const TYPOGRAPHY = {
  // HERO & DISPLAY TEXT
  hero: 'text-4xl md:text-6xl lg:text-7xl font-serif font-medium',          // 36px → 60px → 72px
  display: 'text-3xl md:text-5xl lg:text-6xl font-serif font-medium',       // 30px → 48px → 60px
  
  // HEADINGS (Clear hierarchy)
  h1: 'text-2xl md:text-4xl font-serif font-bold',                          // 24px → 36px (Main page titles)
  h2: 'text-xl md:text-3xl font-serif font-semibold',                       // 20px → 30px (Section headings)  
  h3: 'text-lg md:text-2xl font-serif font-bold',                           // 18px → 24px (Subsection headings)
  h4: 'text-base md:text-xl font-serif font-medium',                        // 16px → 20px (Component headings)
  
  // BODY TEXT (All serif)
  lead: 'text-base md:text-lg font-serif leading-relaxed',                  // 16px → 18px (Lead paragraphs)
  body: 'text-sm md:text-base font-serif',                                  // 14px → 16px (Standard text)
  caption: 'text-xs md:text-sm font-serif',                                 // 12px → 14px (Captions, metadata)
  
  // INTERACTIVE ELEMENTS (All serif)
  button: 'text-sm md:text-base font-serif font-medium',                    // 14px → 16px (Button text)
  nav: 'text-base md:text-lg font-serif',                                   // 16px → 18px (Navigation)
  label: 'text-sm md:text-base font-serif font-medium',                     // 14px → 16px (Form labels)
  
  // SPECIAL CASES
  testimonial: 'text-xl md:text-2xl font-serif font-medium leading-relaxed', // Quotes & testimonials
  price: 'text-base md:text-lg font-serif font-bold',                       // Pricing information
  metadata: 'text-xs md:text-sm font-serif uppercase tracking-wider',       // Small labels, categories
} as const;

/**
 * Typography utility functions
 */
export const getTypographyClass = (variant: keyof typeof TYPOGRAPHY): string => {
  return TYPOGRAPHY[variant];
};

/**
 * Common color combinations for text
 */
export const TEXT_COLORS = {
  primary: '#161618',
  secondary: '#7FB3B3', 
  muted: '#718096',
  white: '#ffffff',
  error: '#dc2626',
} as const; 