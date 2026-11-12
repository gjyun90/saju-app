// 선(stroke) 아이콘
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const IconImage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 8" /></svg>
);
export const IconPdf = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></svg>
);
export const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></svg>
);
export const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
);
export const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base} stroke="#8A8274"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...base}><path d="M4 4l8 8M12 4l-8 8" /></svg>
);
export const IconPrev = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" {...base} strokeWidth={2}><path d="M12.5 4 6.5 10l6 6" /></svg>
);
export const IconNext = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" {...base} strokeWidth={2}><path d="m7.5 4 6 6-6 6" /></svg>
);
export const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" {...base} stroke="#E2C58A" strokeWidth={2}><circle cx="10" cy="10" r="8" /><path d="M10 6v5M10 14h0" /></svg>
);
