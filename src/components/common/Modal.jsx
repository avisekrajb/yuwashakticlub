export default function Modal({ title, sub, onClose, children, wide, cls }) {
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"md" + (wide ? " wide" : "") + (cls ? " " + cls : "")} role="dialog" aria-modal="true">
        {title && <h3>{title}</h3>}{sub && <p className="s">{sub}</p>}
        {children}
      </div>
    </div>
  );
}
