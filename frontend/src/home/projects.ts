// Portfolio projects carried over from the old ArtStation portfolio (src/data/projects.json, media in public/portfolio).
import data from '../data/projects.json';

export interface ImageMedia {
  type: 'image';
  src: string;
  width: number;
  height: number;
  caption?: string;
}

/** A silent clip hosted with the site. */
export interface VideoMedia {
  type: 'video';
  src: string;
  poster: string;
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
  /** Card image, relative to the site root. */
  cover: string;
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

/** Short label for a card: the first category, else the mediums. */
export function projectLabel(project: Project) {
  return project.categories[0] ?? project.mediums.join(' · ');
}
