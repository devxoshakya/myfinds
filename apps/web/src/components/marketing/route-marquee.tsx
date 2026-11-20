const STATIONS = [
  "Rajiv Chowk",
  "Kashmere Gate",
  "New Delhi Railway",
  "Anand Vihar ISBT",
  "Hauz Khas",
  "Noida Sector 18",
  "Chandni Chowk",
  "Dwarka Sector 21",
  "Sarai Kale Khan",
  "Hazrat Nizamuddin",
];

export default function RouteMarquee() {
  return (
    <div className="mf-marquee" aria-label="Live across the Delhi-NCR transport network">
      <div className="mf-marquee__label">
        <span className="mf-live-dot" aria-hidden />
        Live across Delhi-NCR
      </div>
      <div className="mf-marquee__track" aria-hidden>
        <div className="mf-marquee__run">
          {[0, 1].map((copy) => (
            <span className="mf-marquee__set" key={copy}>
              {STATIONS.map((station) => (
                <span className="mf-marquee__station" key={`${copy}-${station}`}>
                  <span className="mf-marquee__mark" aria-hidden />
                  {station}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <div className="mf-marquee__count">339 places indexed</div>
    </div>
  );
}
