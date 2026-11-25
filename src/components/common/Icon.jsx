import { P } from "../../data/icons";

export const I = (n, s = 20) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
);

export default function Icon({ name, size = 20 }) {
  return I(name, size);
}
