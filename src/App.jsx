import { useState, useEffect } from "react";
import "./App.css";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider, useApp } from "./context/AppContext";
import { CallProvider } from "./context/CallContext";
import PublicApp from "./pages/PublicApp";
import AdminApp from "./pages/AdminApp";
import Modal from "./components/common/Modal";
import AuthForm from "./components/auth/AuthForm";
import VideoModal from "./components/public/VideoModal";
import IncomingCall from "./components/calls/IncomingCall";
import CallModal from "./components/calls/CallModal";

function Splash({ failed, onRetry }) {
  return (
    <div className="splash">
      <div className="splash-logo"><i className="grad">Y</i></div>
      <h1>Shree Yuwa Shakti</h1>
      <p>{failed ? "Could not reach the server. Check that the backend is running." : "Loading the club…"}</p>
      {failed ? (
        <button className="btn" type="button" onClick={onRetry}>Try again</button>
      ) : (
        <span className="ldr" role="status" aria-label="Loading" />
      )}
    </div>
  );
}

function Shell() {
  const { dark } = useTheme();
  const { isAdmin, ready, logout } = useAuth();
  const { booted, bootError, say, refreshBootstrap } = useApp();
  const [modal, setModal] = useState(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onAuth = (_user, message) => {
    setModal(null);
    setEpoch((n) => n + 1);
    if (message) say(message);
    refreshBootstrap();
  };

  const doLogout = () => {
    setModal(null);
    setEpoch((n) => n + 1);
    logout();
    say("You have been logged out");
  };

  const modals =
    modal &&
    (modal.t === "login" || modal.t === "signup" ? (
      <Modal
        onClose={() => setModal(null)}
        title={modal.t === "login" ? "Welcome back" : "Join the club"}
        sub={modal.t === "login" ? "Log in to chat, post and go live." : "Create your free member account."}
      >
        <AuthForm
          key={modal.t}
          mode={modal.t}
          onDone={onAuth}
          switchTo={() => setModal({ t: modal.t === "login" ? "signup" : "login" })}
        />
      </Modal>
    ) : modal.t === "logout" ? (
      <Modal onClose={() => setModal(null)} title="Do you want to log out?" sub="You will need to log in again to chat, post or start calls.">
        <div className="row2">
          <button className="btn line" onClick={() => setModal(null)}>Stay</button>
          <button className="btn red" onClick={doLogout}>Log out</button>
        </div>
      </Modal>
    ) : modal.t === "video" ? (
      <VideoModal g={modal.g} onClose={() => setModal(null)} />
    ) : null);

  return (
    <div className={"syc" + (dark ? " dark" : "")}>
      {!ready || !booted || bootError ? (
        <Splash failed={Boolean(bootError)} onRetry={refreshBootstrap} />
      ) : isAdmin ? (
        <AdminApp key={epoch} setModal={setModal} />
      ) : (
        <PublicApp key={epoch} setModal={setModal} />
      )}
      {modals}
      <IncomingCall />
      <CallModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <CallProvider>
            <Shell />
          </CallProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
