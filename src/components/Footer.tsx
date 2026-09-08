export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-tmdb">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <img
            className="tmdb-logo"
            src="tmdb-logo.svg"
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
