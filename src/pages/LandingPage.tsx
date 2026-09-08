import Hero from '../components/Hero';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="starfield" aria-hidden="true" />
      <Hero />
      <Footer />
    </div>
  );
}