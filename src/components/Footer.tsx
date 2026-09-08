export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-tmdb">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <img
            className="tmdb-logo"
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228ca3db904c0dca977aed7a0e.svg"
            alt="The Movie Database (TMDB)"
          />
        </a>
        <p>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
      <p className="footer-made">Hecho con 🎃</p>
    </footer>
  );
}
