import { levels, levelUrl, settings, type LevelConfig } from '../site';
import { availabilityLabel, type Availability } from './availability';
import { formatPublished, hasMotion, projectLabel, projects, type Project } from './projects';
import { href } from './routing';
import { profile } from './profile';
import { ArrowIcon, PlayIcon } from './icons';

export function HomePage({ availability, onContact }: { availability: Availability; onContact: () => void }) {
  return (
    <>
      <Hero />
      <Experiences availability={availability} />
      <Portfolio />
      <About onContact={onContact} />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <p className="kicker">
          {profile.name} · {profile.role}
        </p>
        <h1 className="hero-title">
          Architecture you can <em>walk through.</em>
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

function ExperienceCard({ level, index, availability }: { level: LevelConfig; index: number; availability: Availability }) {
  const unavailable = availability.status === 'unavailable';
  const content = (
    <>
      <div className="experience-media">
        {level.image && (
          <img
            src={level.image}
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
          {unavailable ? (
            'Offline right now, check back soon'
          ) : (
            <>
              {availability.status === 'busy' ? 'Join the line' : 'Enter experience'} <ArrowIcon />
            </>
          )}
        </span>
      </div>
    </>
  );

  // While the streaming PC is stopped there is nothing to connect to, so the card isn't a link.
  return unavailable ? (
    <article className="experience-card is-unavailable" aria-disabled="true">
      {content}
    </article>
  ) : (
    <a className="experience-card" href={levelUrl(level.id)}>
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
      <div className="work-grid">
        {projects.map((project) => (
          <WorkCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}

function WorkCard({ project }: { project: Project }) {
  return (
    <a className="work-card" href={href.project(project.slug)}>
      <div className="work-media">
        <img src={project.cover} alt="" loading="lazy" />
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
