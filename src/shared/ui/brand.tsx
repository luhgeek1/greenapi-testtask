import './brand.css';

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        M
      </span>
      <span>
        MAX<span className="brand-byline">через GREEN-API</span>
      </span>
    </span>
  );
}
