import { dayLabel } from "../../utils";

export default function DaySeparator({ t }) {
  return <div className="dsep"><span>{dayLabel(t)}</span></div>;
}
