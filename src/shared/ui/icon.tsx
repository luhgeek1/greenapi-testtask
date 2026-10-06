const paths = {
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-8.5A8.5 8.5 0 1 1 21 11.5Z',
  plus: 'M12 5v14M5 12h14',
  send: 'm3 3 19 9-19 9 4-9-4-9Zm4 9h15',
  back: 'm15 18-6-6 6-6',
  logout: 'M10 17v3H4V4h6v3M8 12h13m-4-4 4 4-4 4',
  check: 'm5 12 4 4L19 6',
  connection: 'M8 3v4m8-4v4M6 7h12v3a6 6 0 0 1-6 6v5m-6-11h12',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h5',
  code: 'm8 5-5 7 5 7m8-14 5 7-5 7m-3-16-2 18',
  copy: 'M9 9h11v12H9V9ZM5 15H3V3h12v2',
  clear: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  lock: 'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 4v3',
  settings: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
  server: 'M3 3h18v7H3V3Zm0 11h18v7H3v-7M7 6.5h.01M7 17.5h.01',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  message:
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7H4l-3 3V11.5A8.5 8.5 0 1 1 21 11.5Z',
  attach:
    'm21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7L10 17a2 2 0 0 1-2.8-2.8l8.5-8.5',
  close: 'm6 6 12 12M6 18 18 6',
  eyeOff:
    'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A11 11 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.2 3.8M6.6 6.6A19 19 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.4-1.6',
};

export function Icon({
  name,
  className = '',
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
