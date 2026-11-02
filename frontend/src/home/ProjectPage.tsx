import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Lightbox } from './Lightbox';
import { findProject, formatPublished, MEDIA_SIZES, mediaSrcSet, posterSrc, projects, type ImageMedia, type Media, type Project } from './projects';
import { href } from './routing';
import { BackIcon, PlayIcon, SoundIcon } from './icons';

export function ProjectPage({ slug }: { slug: string }) {
  const project = findProject(slug);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Close the lightbox when moving to another project.
  useEffect(() => setLightboxIndex(null), [slug]);

  if (!project) {
    return (
      <section className="section project-missing">
        <h1 className="section-title">Project not found</h1>
        <a className="button button-ghost" href={href.section('work')}>
          <BackIcon /> Back to the portfolio
        </a>
      </section>
    );
  }

  const images = project.media.filter((item): item is ImageMedia => item.type === 'image');
  const index = projects.indexOf(project);
  const newer = projects[index - 1];
  const older = projects[index + 1];

  return (
    <article className="project">
      <header className="project-head">
        <a className="back-link" href={href.section('work')}>
          <BackIcon /> Portfolio
        </a>
        <p className="kicker">{formatPublished(project.published)}</p>
        <h1 className="project-title">{project.title}</h1>
        <dl className="project-facts">
          <Fact label="Discipline" values={project.categories} />
          <Fact label="Medium" values={project.mediums} />
          <Fact label="Software" values={project.software} />
        </dl>
        {project.description.length > 0 && (
          <div className="project-description">
            {project.description.map((paragraph, i) => (
              <p key={i}>{linkify(paragraph)}</p>
            ))}
          </div>
        )}
      </header>

      <div className="project-media">
        {project.media.map((item, i) => (
          <figure key={i} className="media-item">
            <MediaView
              item={item}
              first={i === 0}
              label={mediaLabel(project, item)}
              onOpen={() => setLightboxIndex(images.indexOf(item as ImageMedia))}
            />
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        ))}
      </div>

      <nav className="project-nav" aria-label="More projects">
        {newer ? <ProjectLink project={newer} label="Newer" /> : <span />}
        {older ? <ProjectLink project={older} label="Older" align="end" /> : <span />}
      </nav>

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <Lightbox
          images={images}
          altFor={(image) => mediaLabel(project, image)}
          index={lightboxIndex} onIndex={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </article>
  );
}

/** Text alternative for a picture or video: its caption, else the project and its place in the gallery. */
function mediaLabel(project: Project, item: Media) {
  if (item.caption) return item.caption;
  const kind = item.type === 'image' ? 'image' : 'video';
  const ofKind = project.media.filter((other) => (other.type === 'image') === (item.type === 'image'));
  return ofKind.length > 1 ? `${project.title}, ${kind} ${ofKind.indexOf(item) + 1} of ${ofKind.length}` : `${project.title}, ${kind}`;
}

function Fact({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{values.join(', ')}</dd>
    </div>
  );
}

function ProjectLink({ project, label, align }: { project: Project; label: string; align?: 'end' }) {
  return (
    <a className={`project-link${align === 'end' ? ' is-end' : ''}`} href={href.project(project.slug)}>
      <img src={project.cover} alt="" loading="lazy" />
      <span>
        <span className="kicker">{label}</span>
        <span className="project-link-title">{project.title}</span>
      </span>
    </a>
  );
}

function MediaView({ item, first, label, onOpen }: { item: Media; first: boolean; label: string; onOpen: () => void }) {
  const ratio = `${item.width} / ${item.height}`;
  if (item.type === 'image') {
    return (
      <button className="media-image" style={{ aspectRatio: ratio }} onClick={onOpen} aria-label={`View full size: ${label}`}>
        {/* The first picture is the largest thing on screen: fetch it straight away. */}
        <img
          src={item.src}
          srcSet={mediaSrcSet(item.src, item.width)}
          sizes={MEDIA_SIZES}
          alt={label}
          loading={first ? 'eager' : 'lazy'}
          fetchPriority={first ? 'high' : 'auto'}
          width={item.width}
          height={item.height}
        />
      </button>
    );
  }
  if (item.type === 'video') {
    return <AutoVideo src={item.src} poster={posterSrc(item.poster, item.width)} ratio={ratio} label={label} audio={item.audio} />;
  }
  return <YouTube id={item.id} poster={item.poster} width={item.width} label={label} />;
}

/**
 * Clip that plays while on screen and pauses when scrolled away; nothing loads until it's near the viewport. It starts
 * muted (browsers only autoplay silent video); clips with a sound track get a Sound on/off button, kept in step with
 * the player's own volume control.
 */
export function AutoVideo({ src, poster, ratio, label, audio }: { src: string; poster: string; ratio: string; label: string; audio?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void element.play().catch(() => {});
        else element.pause();
      },
      { threshold: 0.35 }
    );
    observer.observe(element);
    const sync = () => setMuted(element.muted);
    element.addEventListener('volumechange', sync);
    return () => {
      observer.disconnect();
      element.removeEventListener('volumechange', sync);
    };
  }, []);

  const toggleSound = () => {
    const element = video.current;
    if (!element) return;
    element.muted = !element.muted;
    if (!element.muted) void element.play().catch(() => {});
  };

  return (
    <div className="media-video-wrap">
      <video
        ref={video}
        className="media-video"
        style={{ aspectRatio: ratio }}
        src={src}
        poster={poster}
        aria-label={label}
        muted
        loop
        playsInline
        controls
        preload="none"
      />
      {audio && (
        <button className="video-sound" onClick={toggleSound} aria-pressed={!muted}>
          <SoundIcon muted={muted} /> {muted ? 'Sound on' : 'Sound off'}
        </button>
      )}
    </div>
  );
}

/** YouTube player, loaded only when clicked (no third-party requests until then). */
function YouTube({ id, poster, width, label }: { id: string; poster: string; width: number; label: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="media-youtube">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button className="youtube-poster" onClick={() => setPlaying(true)} aria-label={`Play video: ${label}`}>
          <img src={poster} srcSet={mediaSrcSet(poster, width)} sizes={MEDIA_SIZES} alt="" loading="lazy" />
          <span className="youtube-play">
            <PlayIcon />
          </span>
        </button>
      )}
    </div>
  );
}

function linkify(text: string): ReactNode {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
