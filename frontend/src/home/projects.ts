// Portfolio projects carried over from the old ArtStation portfolio (src/data/projects.json, media in public/portfolio).
import data from '../data/projects.json';

export interface ImageMedia {
  type: 'image';
  src: string;
  width: number;
  height: number;
  caption?: string;
}

/** A clip hosted with the site. It autoplays muted; set audio when the file has a sound track to show a sound toggle. */
export interface VideoMedia {
  type: 'video';
  src: string;
  poster: string;
  audio?: boolean;
  width: number;
  height: number;
  caption?: string;
}

export interface YouTubeMedia {
  type: 'youtube';
  id: string;
  poster: string;
  width: number;
  height: number;
  caption?: string;
}

export type Media = ImageMedia | VideoMedia | YouTubeMedia;

export interface Project {
  slug: string;
  title: string;
  /** Publishing date on the old portfolio, YYYY-MM-DD. */
  published: string;
  description: string[];
  categories: string[];
  software: string[];
  mediums: string[];
  /** Card image, relative to the site root, 960px wide. */
  cover: string;
  /** The same image 1600px wide, for wide cards and high-density screens. */
  coverLarge?: string;
  media: Media[];
}

/** Newest first, the order they were published in on the old portfolio. */
export const projects: Project[] = (data as Project[]).slice().sort((a, b) => b.published.localeCompare(a.published));

export function findProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function formatPublished(published: string, month: 'long' | 'short' = 'long') {
  const [year, monthIndex] = published.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', { month, year: 'numeric' });
}

export function hasMotion(project: Project) {
  return project.media.some((item) => item.type !== 'image');
}

/** srcset for a project's cover: both sizes when there's a large one. */
export function coverSrcSet(project: Project) {
  return project.coverLarge ? `${project.cover} 960w, ${project.coverLarge} 1600w` : undefined;
}

/**
 * srcset for a gallery picture or poster: pictures wider than 1100px also have a 960px copy (<name>-960.webp) for
 * phones. scripts/prerender.mjs fails the build if one is missing.
 */
export function mediaSrcSet(src: string, width: number) {
  return width > 1100 && src.endsWith('.webp') ? `${src.replace(/\.webp$/, '-960.webp')} 960w, ${src} ${width}w` : undefined;
}
/** A video's poster shows only until the clip plays, so it's always the 960px copy when there is one. */
export function posterSrc(poster: string, width: number) {
  return width > 1100 && poster.endsWith('.webp') ? poster.replace(/\.webp$/, '-960.webp') : poster;
}
/** Gallery pictures span the content column. */
export const MEDIA_SIZES = '(max-width: 1240px) 100vw, 1160px';

/** Short label for a card: the first category, else the mediums. */
export function projectLabel(project: Project) {
  return project.categories[0] ?? project.mediums.join(' · ');
}
