import { levels, levelUrl, settings, type LevelConfig } from '../site';
import { availabilityLabel, type Availability } from './availability';
import { coverSrcSet, formatPublished, hasMotion, posterSrc, projectLabel, projects, type Project } from './projects';
import { AutoVideo } from './ProjectPage';
import { href } from './routing';
import { profile } from './profile';
import { ArrowIcon, PlayIcon } from './icons';
import { HeroBuilding } from './HeroBuilding';
import { DesignToReality } from './DesignToReality';
import { Services } from './Services';

export function HomePage({ availability, onContact }: { availability: Availability; onContact: (services?: string[]) => void }) {
  return (
    <>
      <Hero />
      <Experiences availability={availability} />
      <DesignToReality />
      <Services onQuote={onContact} />
      <Portfolio />
      <About onContact={() => onContact()} />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <HeroBuilding />
      <div className="hero-inner">
        <p className="kicker">
          {profile.name} · {profile.role}
        </p>
        <h1 className="hero-title">
          Architecture in <em>Motion</em>
        </h1>
        <p className="hero-lede">
          {settings.subtitle || 'Interactive architecture, streamed live from Unreal Engine'}. Open a project in your
          browser, no install, then browse a selection of real-time environments, product and architectural work.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={href.section('experiences')}>
            Enter a live experience <ArrowIcon />
          </a>
          <a className="button button-ghost" href={href.section('work')}>
            View the portfolio
          </a>
        </div>
      </div>
    </section>
  );
}

function Experiences({ availability }: { availability: Availability }) {
  return (
    <section id="experiences" className="section">
      <div className="section-head">
        <p className="kicker">Live from Unreal Engine</p>
        <h2 className="section-title">Interactive experiences</h2>
        <p className="section-lede muted">
          Walk, orbit and change the time of day in real time. One visitor explores at a time; if someone is already
          inside you can join the line and it starts automatically when it's your turn.
        </p>
      </div>
      <div className="experience-grid">
        {levels.map((level, index) => (
          <ExperienceCard key={level.id} level={level} index={index} availability={availability} />
        ))}
      </div>
    </section>
  );
}

const ACTION_TEXT: Partial<Record<Availability['status'], string>> = {
  unavailable: 'Offline · view the preview',
  busy: 'Join the line',
  asleep: 'Wake it up · ready in about 3 min',
  starting: 'Starting up · join now'
};

function ExperienceCard({ level, index, availability }: { level: LevelConfig; index: number; availability: Availability }) {
  const content = (
    <>
      <div className="experience-media">
        {level.image && (
          <img
            src={level.image}
            srcSet={level.imageSrcset}
            sizes="(max-width: 900px) 100vw, 600px"
            alt=""
            loading="lazy"
            width={1280}
            height={720}
            onError={(event) => event.currentTarget.remove()}
          />
        )}
        <StatusBadge availability={availability} />
      </div>
      <div className="experience-body">
        <span className="experience-index">{String(index + 1).padStart(2, '0')}</span>
        <h3>{level.title}</h3>
        {level.subtitle && <p className="experience-subtitle">{level.subtitle}</p>}
        {level.description && <p className="experience-description muted">{level.description}</p>}
        <span className="experience-action">
          {ACTION_TEXT[availability.status] ?? 'Enter experience'} <ArrowIcon />
        </span>
      </div>
    </>
  );

  // Offline cards still open the experience page, which shows stills from the project instead of the stream.
  // Asleep or starting, that page wakes the cloud VM and joins the line by itself once it's up.
  const waking = availability.status === 'asleep' || availability.status === 'starting';
  // The card's text runs together when read as one link ("Available Now01Movie Studio…"), so name it plainly; the
  // status badge inside still announces changes on its own.
  const label = `${level.title}: ${ACTION_TEXT[availability.status] ?? 'Enter experience'}`;
  return (
    <a className="experience-card" href={levelUrl(level.id, { wake: waking })} aria-label={label}>
      {content}
    </a>
  );
}

function StatusBadge({ availability }: { availability: Availability }) {
  return (
    <span className="status-badge" data-status={availability.status} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      {availabilityLabel(availability)}
    </span>
  );
}

function Portfolio() {
  const first = projects[projects.length - 1]?.published.slice(0, 4);
  const last = projects[0]?.published.slice(0, 4);
  return (
    <section id="work" className="section">
      <div className="section-head">
        <p className="kicker">
          Portfolio · {first}–{last}
        </p>
        <h2 className="section-title">Selected work</h2>
        <p className="section-lede muted">
          Architectural drafting, product design and real-time environments, newest first.
        </p>
      </div>
      {/* Showreel cut from the project clips with sound (Springtime In The West, Mars Colony Outer Rim, Forever
          Reaching Out). Publish a new cut under a new file name: /portfolio/ is cached for 7 days. */}
      <figure className="reel">
        <AutoVideo
          src="portfolio/reel/showreel-2026.mp4"
          poster={posterSrc('portfolio/reel/showreel-2026.webp', 1920)}
          ratio="1920 / 816"
          label="Showreel: Springtime In The West, Mars Colony Outer Rim and Forever Reaching Out"
          audio
        />
        <figcaption className="muted">Showreel · real-time environments in Unreal Engine</figcaption>
      </figure>
      <div className="work-grid">
        {projects.map((project, index) => (
          <WorkCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}

/**
 * Rendered width of a portfolio card, for the browser to pick a cover size. Mirrors .work-grid in home.css: a 12-column
 * row pattern of 7/5, 4/4/4, 5/7, then a full-width card; two columns (every third card full width) up to 900px; one
 * column up to 640px.
 */
function workCardSizes(index: number) {
  const span = [7, 5, 4, 4, 4, 5, 7, 12][index % 8];
  const tablet = index % 3 === 0 ? '100vw' : '50vw';
  return `(max-width: 640px) 100vw, (max-width: 900px) ${tablet}, min(${Math.round((span / 12) * 100)}vw, ${Math.round((1160 * span) / 12)}px)`;
}

function WorkCard({ project, index }: { project: Project; index: number }) {
  const srcSet = coverSrcSet(project);
  return (
    <a className="work-card" href={href.project(project.slug)}>
      <div className="work-media">
        <img src={project.cover} srcSet={srcSet} sizes={srcSet && workCardSizes(index)} alt="" loading="lazy" />
        {hasMotion(project) && (
          <span className="work-motion">
            <PlayIcon /> Video
          </span>
        )}
      </div>
      <div className="work-body">
        <h3>{project.title}</h3>
        <p className="work-meta">
          <span>{formatPublished(project.published, 'short')}</span>
          {projectLabel(project) && <span>{projectLabel(project)}</span>}
        </p>
      </div>
    </a>
  );
}

function About({ onContact }: { onContact: () => void }) {
  return (
    <section id="about" className="section about">
      <div className="about-intro">
        <p className="kicker">About</p>
        <h2 className="section-title">{profile.name}</h2>
        <p className="about-role">{profile.role}</p>
        <p className="muted">{profile.location}</p>
        <button className="button button-primary" onClick={onContact}>
          Get in touch <ArrowIcon />
        </button>
      </div>
      <div className="about-body">
        <p className="about-summary">{profile.summary}</p>
        <div className="about-lists">
          <div>
            <h3>Skills</h3>
            <ul className="chips">
              {profile.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Software</h3>
            <ul className="chips">
              {profile.software.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
