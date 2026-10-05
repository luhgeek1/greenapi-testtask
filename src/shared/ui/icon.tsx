const paths = {
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-8.5A8.5 8.5 0 1 1 21 11.5Z',
  plus: 'M12 5v14M5 12h14',
  send: 'm3 3 19 9-19 9 4-9-4-9Zm4 9h15',
  back: 'm15 18-6-6 6-6',
  logout: 'M10 17v3H4V4h6v3M8 12h13m-4-4 4 4-4 4',
  check: 'm5 12 4 4L19 6',
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
