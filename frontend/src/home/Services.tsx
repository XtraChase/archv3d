import { ArrowIcon } from './icons';

// Home page section: what Chase offers. No prices: every project is quoted, and each card opens the quote form with
// its services already ticked (the names must match SERVICES in ContactDialog.tsx and the contact Worker).

const common = { width: 36, height: 36, viewBox: '0 0 32 32', fill: 'none', 'aria-hidden': true } as const;
const line = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SERVICES = [
  {
    title: 'CAD drafting',
    text: 'Construction drawings drafted in Revit and AutoCAD: plans, elevations, sections and details, laid out on titled sheets.',
    includes: ['Floor plans and elevations', 'Sections and construction details', 'PDF and DWG sheet sets'],
    quote: ['CAD drafting'],
    icon: (
      <svg {...common}>
        <path d="M5 27h22M5 27V9l9-4v22M14 13h13v14M18 17h5M18 21h5" {...line} />
      </svg>
    )
  },
  {
    title: 'BIM / Revit model',
    text: 'A full Revit model of a new design or an existing home, the one source the drawings, views and visuals come from.',
    includes: ['New designs or as-built models', 'Drawings and views from the model', 'Native RVT, IFC or exported views'],
    quote: ['BIM / Revit model'],
    icon: (
      <svg {...common}>
        <path d="M16 4 27 10v12l-11 6-11-6V10l11-6Zm0 0v24M5 10l11 6 11-6" {...line} />
      </svg>
    )
  },
  {
    title: 'Still renderings',
    text: 'Photoreal interior and exterior images rendered in Unreal Engine, for marketing, listings or design review.',
    includes: ['Exterior and interior views', 'Daylight, dusk and seasonal looks', 'High-resolution images for print and web'],
    quote: ['Still renderings'],
    icon: (
      <svg {...common}>
        <rect x="4" y="7" width="24" height="18" rx="2" {...line} />
        <path d="m4 21 7-6 5 4 4-3 8 6" {...line} />
        <circle cx="21.5" cy="12.5" r="2" {...line} />
      </svg>
    )
  },
  {
    title: 'Walkthroughs & Unreal tours',
    text: 'Animated walkthrough videos, and interactive tours streamed to any browser like the live experiences on this site, with nothing for your clients to install.',
    includes: ['Cinematic walkthrough videos', 'Interactive Unreal Engine tours', 'Browser streaming with a guided tour'],
    quote: ['Animated walkthrough', 'Interactive Unreal tour'],
    icon: (
      <svg {...common}>
        <circle cx="16" cy="16" r="12" {...line} />
        <path d="m13 11 8 5-8 5V11Z" {...line} />
      </svg>
    )
  }
];

export function Services({ onQuote }: { onQuote: (services: string[]) => void }) {
  return (
    <section id="services" className="section">
      <div className="section-head">
        <p className="kicker">Services</p>
        <h2 className="section-title">From the first drawing to a tour you can walk</h2>
        <p className="section-lede muted">
          Drafting, modeling and visualization for architects, developers and homeowners. Every project is priced on its
          own: tell me about yours and I’ll send a quote.
        </p>
      </div>
      <div className="service-grid">
        {SERVICES.map((service) => (
          <article key={service.title} className="service-card">
            <span className="service-icon">{service.icon}</span>
            <h3>{service.title}</h3>
            <p className="muted">{service.text}</p>
            <ul className="service-includes">
              {service.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="service-quote" onClick={() => onQuote(service.quote)}>
              Get a quote <ArrowIcon />
              <span className="visually-hidden"> for {service.title}</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
