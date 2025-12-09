/**
 * Property and Property Management Images
 * A curated collection of high-quality property images for the sign-in page
 */

export interface PropertyImage {
  url: string;
  alt: string;
  credit?: string;
}

export const propertyImages: PropertyImage[] = [
  {
    url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Modern apartment building exterior with balconies",
  },
  {
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Luxury residential complex with pool",
  },
  {
    url: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Contemporary apartment interior living space",
  },
  {
    url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Beautiful modern house with large windows",
  },
  {
    url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Cozy modern living room interior",
  },
  {
    url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Contemporary house exterior at sunset",
  },
  {
    url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Modern apartment building facade",
  },
  {
    url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Stylish minimalist apartment interior",
  },
  {
    url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Modern residential building with glass facade",
  },
  {
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    alt: "Elegant modern house exterior with landscaping",
  },
];

/**
 * Get a random property image from the collection
 */
export function getRandomPropertyImage(): PropertyImage {
  const randomIndex = Math.floor(Math.random() * propertyImages.length);
  return propertyImages[randomIndex];
}

/**
 * Get a property image based on date (changes daily)
 * This ensures the same image is shown throughout the day but changes daily
 */
export function getDailyPropertyImage(): PropertyImage {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const imageIndex = dayOfYear % propertyImages.length;
  return propertyImages[imageIndex];
}

/**
 * Get a property image based on session (changes each login)
 * Uses timestamp to ensure different image on each page load
 */
export function getSessionPropertyImage(): PropertyImage {
  // Use current timestamp modulo array length for variety
  const timeBasedIndex = Date.now() % propertyImages.length;
  return propertyImages[timeBasedIndex];
}
