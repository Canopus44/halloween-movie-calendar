import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-pumpkin float-slow" aria-hidden="true">🎃</div>
      <span className="hero-bat bat-1" aria-hidden="true">🦇</span>
      <span className="hero-bat bat-2" aria-hidden="true">🦇</span>
      <h1 className="hero-title">HALLOWEEN MOVIE CALENDAR</h1>
      <p className="hero-subtitle">31 noches. 31 películas. Una noche de terror a la vez.</p>
      <Link to="/calendar" className="btn btn-primary hero-cta">
        Comenzar el calendario
      </Link>
    </div>
  );
}
