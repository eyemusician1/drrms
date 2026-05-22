import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import heroBg from '../../assets/public/bg.jpeg';
import './Dashboard.css';

// ─── Static data ────────────────────────────────────────────
const FEED_ITEMS = [
  { type: 'Typhoon',    location: 'Cagayan, Region II',        status: 'ongoing',  time: 'just now' },
  { type: 'Flood',      location: 'Pampanga, Region III',      status: 'ongoing',  time: '14m ago'  },
  { type: 'Landslide',  location: 'Benguet, CAR',              status: 'ongoing',  time: '1h ago'   },
  { type: 'Earthquake', location: 'Davao Oriental, Region XI', status: 'resolved', time: '3h ago'   },
  { type: 'Wildfire',   location: 'Palawan, MIMAROPA',         status: 'resolved', time: '6h ago'   },
];

const STATS = [
  { num: '17',   label: 'Active incidents'     },
  { num: '82',   label: 'Evacuation centers'   },
  { num: '340k', label: 'Individuals tracked'  },
  { num: '24/7', label: 'Monitoring coverage'  },
];

const HOW_STEPS = [
  {
    num: '01',
    title: 'Incident is logged',
    body: 'Field officers and automated sensors log environmental threats and anomalies in real-time into the centralized directory.'
  },
  {
    num: '02',
    title: 'Track and monitor your region',
    body: 'Local DRRMOs verify the data, updating severity levels and expected impact zones on the live map.'
  },
  {
    num: '03',
    title: 'Deployment & relief',
    body: 'Response teams are dispatched, and evacuation centers are initialized based on the monitored severity and affected population.'
  }
];

const PublicDashboard = () => {
  // 1. Setup states and refs for the scroll spy interaction
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the step hits the middle 40% of the screen, make it active
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveStep(index);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="pl__layout">
      {/* ── Navigation (Project Genie Style) ────────────────── */}
      <nav className="pl__nav" role="navigation">
        <div className="pl__nav-brand">
          DRRMS
        </div>

        {/* Navigation links centered perfectly by the CSS Grid */}
        <ul className="pl__nav-links">
          <li><a className="pl__nav-link" href="#overview">Overview</a></li>
          <li><a className="pl__nav-link" href="#incidents">Incidents</a></li>
          <li><a className="pl__nav-link" href="#how-it-works">How it works</a></li>
          <li><a className="pl__nav-link" href="#access">Access</a></li>
        </ul>

        {/* Kept empty to balance the Grid layout without exposing the portal link early */}
        <div className="pl__nav-actions">
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="pl__main">
        {/* ── Hero ────────────────────────────────────────────── */}
        <header className="pl__hero">
          <div className="pl__hero-content">
            <h1 className="pl__hero-h1">National<br />Threat Directory</h1>
            <p className="pl__hero-sub">
              Live monitoring of environmental hazards, ongoing rescue operations,
              and evacuation centers across the archipelago.
            </p>
          </div>
        </header>

        {/* ── Stats / Overview ────────────────────────────────── */}
        <section id="overview" className="pl__section pl__overview">
          <div className="pl__overview-inner">
            <div className="pl__overview-panel">
              <h2 className="pl__overview-h2">Nationwide<br/>readiness.</h2>
              <p className="pl__overview-p">
                Our interconnected system provides localized insight with
                national oversight, ensuring resources are deployed where
                they are needed most.
              </p>
            </div>
            <div className="pl__stats-grid">
              {STATS.map((s, i) => (
                <div className="pl__stat-card" key={i}>
                  <div className="pl__stat-num">{s.num}</div>
                  <div className="pl__stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Incidents Feed ──────────────────────────────────── */}
        <section id="incidents" className="pl__section">
          <div className="pl__section-header">
            <h2>Live Incident Feed</h2>
          </div>
          <div className="pl__feed">
            {FEED_ITEMS.map((item, i) => (
              <div className="pl__feed-item" key={i}>
                <div className="pl__feed-meta">
                  {/* Replaced Dotted colored points with clean text badges */}
                  <span className={`pl__status-badge ${item.status === 'ongoing' ? 'is-ongoing' : 'is-resolved'}`}>
                    {item.status === 'ongoing' ? 'Ongoing' : 'Resolved'}
                  </span>
                  <span className="mono-label" style={{ fontSize: '0.75rem', textTransform: 'none' }}>{item.time}</span>
                </div>
                <h3 className="pl__feed-title">{item.type}</h3>
                <p className="pl__feed-loc">{item.location}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────── */}
        <section id="how-it-works" className="pl__section pl__how">
          <div className="pl__how-inner">
            <h2 className="pl__section-h2">Response lifecycle.</h2>

            {/* Scroll Spy Container */}
            <div className="pl__steps-container">
              {HOW_STEPS.map((step, idx) => (
                <div
                  key={idx}
                  ref={(el) => (stepRefs.current[idx] = el)}
                  data-index={idx}
                  className={`step-item ${activeStep === idx ? 'is-active' : ''}`}
                >
                  <h3 className="step-title">
                    <span className="step-num">{step.num}</span> {step.title}
                  </h3>

                  {/* Description expands only when active */}
                  <div className="step-description">
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── Access / CTA ────────────────────────────────────── */}
        <section id="access" className="pl__section pl__access">
          <div className="pl__access-inner">
            <div className="pl__access-text">
              <h2 className="pl__access-h2" id="access-heading">
                Public information stays open. Operations stay protected.
              </h2>
              <p className="pl__access-sub">
                This page is visible to anyone. The operations portal requires
                authorized credentials — issued only to registered response officers
                through their regional DRRMO.
              </p>
            </div>
            <div className="pl__access-actions">
              {/* Operations portal link stays protected down here */}
              <Link className="pl__btn pl__btn--primary" to="/login">
                Operations portal
              </Link>
              <p className="pl__access-note">
                Authorized response officers only. Contact your regional DRRMO for access.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="pl__footer" role="contentinfo">
        <span className="pl__footer-brand">
          DRRMS · Disaster Risk Reduction Management System
        </span>
        <span className="pl__footer-meta">
          Philippines
        </span>
      </footer>
    </div>
  );
};

export default PublicDashboard;