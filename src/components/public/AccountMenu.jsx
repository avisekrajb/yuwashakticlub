import { useState } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";

export default function AccountMenu({ go, openAuth, askLogout }) {
  const { me, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const goTo = (page) => {
    setOpen(false);
    go(page);
  };

  const auth = (mode) => {
    setOpen(false);
    openAuth(mode);
  };

  return (
    <div className="pr">
      <button
        className={"pbtn" + (me ? " has grad" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        {me ? me.photo ? <img src={me.photo} alt="" /> : me.name[0].toUpperCase() : I("user")}
      </button>
      {open && (
        <>
          <div className="pop-scrim" onClick={() => setOpen(false)} />
          <div className="dd" style={{ zIndex: 60 }}>
            {me ? (
              <>
                <div className="who">
                  <Avatar u={me} size={36} />
                  <div>
                    <b>{me.name}</b>
                    {me.email}
                  </div>
                </div>
                <button onClick={() => goTo("profile")}>{I("user", 18)}Profile</button>
                <button onClick={() => goTo("settings")}>{I("set", 18)}Settings</button>
                {isAdmin && <button onClick={() => goTo("admin")}>{I("grid", 18)}Admin panel</button>}
                <button className="rd" onClick={() => { setOpen(false); askLogout(); }}>{I("out", 18)}Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => auth("login")}>{I("user", 18)}Login</button>
                <button onClick={() => auth("signup")}>{I("plus", 18)}Sign up</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
