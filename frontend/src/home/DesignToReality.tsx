import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { mediaSrcSet } from './projects';
import { href } from './routing';
import { ArrowIcon } from './icons';

// Home page section: one project followed from construction drawing to Revit model to the finished build, in one
// frame. Steps advance on their own while the section is on screen, until the visitor picks one.

const PROJECT = 'madison-ridge-outdoor-kitchen';
const BASE = `portfolio/${PROJECT}`;

const STEPS = [
  {
    label: 'Drawn',
    detail: 'Construction drawings in Revit',
    src: `${BASE}/06.webp`,
    width: 1920,
    alt: 'Revit side elevation of the outdoor kitchen: shed roof, door, deck, railing and stairs, with dimensions and levels'
  },
  {
    label: 'Modeled',
    detail: 'The 3D model the drawings come from',
    src: `${BASE}/01.webp`,
    width: 1920,
    alt: 'Revit 3D model of the outdoor kitchen: a shed-roof cabin with a serving window, door, wraparound deck and stairs'
  },
  {
    label: 'Built',
    detail: 'The finished outdoor kitchen on site',
    src: `${BASE}/02.webp`,
    width: 1920,
    alt: 'The built outdoor kitchen among pine trees: cedar siding, an open serving window with bar stools, and the deck'
  }
];

const STEP_MS = 4500;

export function DesignToReality() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const section = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Advance while on screen and until the visitor takes over.
  useEffect(() => {
    const element = section.current;
    if (!auto || !element) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), STEP_MS);
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [auto]);

  const choose = (index: number) => {
    setAuto(false);
    setStep(index);
  };

  // Tabs pattern: arrow keys move between steps.
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + STEPS.length) % STEPS.length;
    choose(next);
    tabs.current[next]?.focus();
  };

  return (
    <section ref={section} id="process" className="section process">
      <div className="section-head">
        <p className="kicker">Design to reality</p>
        <h2 className="section-title">From drawing to built</h2>
        <p className="section-lede muted">
          Madison Ridge Hideaway Outdoor Kitchen, followed from the construction drawings through the Revit model to the
          finished build.
        </p>
      </div>

      <div className="process-frame">
        {STEPS.map((item, index) => (
          <div
            key={item.src}
            id={`process-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`process-tab-${index}`}
            aria-hidden={index !== step}
            className={`process-panel${index === step ? ' is-active' : ''}`}
          >
            <img
              className={`process-image${index === 0 ? ' is-drawing' : ''}`}
              src={item.src}
              srcSet={mediaSrcSet(item.src, item.width)}
              sizes="(max-width: 900px) 100vw, 700px"
              alt={item.alt}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="process-steps" role="tablist" aria-label="Project stages">
        {STEPS.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`process-tab-${index}`}
            role="tab"
            aria-selected={index === step}
            aria-controls={`process-panel-${index}`}
            tabIndex={index === step ? 0 : -1}
            className={`process-step${index === step ? ' is-active' : ''}`}
            onClick={() => choose(index)}
            onKeyDown={(event) => onKey(event, index)}
          >
            <span className="process-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="process-label">{item.label}</span>
            <span className="process-detail">{item.detail}</span>
            {/* Progress along the active step while it advances on its own. */}
            {index === step && auto && <span className="process-progress" key={step} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <a className="process-link" href={href.project(PROJECT)}>
        See the whole project <ArrowIcon />
      </a>
    </section>
  );
}
