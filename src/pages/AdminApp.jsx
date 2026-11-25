import Admin from "../components/admin/Admin";
import Toast from "../components/common/Toast";
import { useApp } from "../context/AppContext";

export default function AdminApp({ setModal }) {
  const { toast, dismiss } = useApp();
  return (
    <>
      <Admin askLogout={() => setModal({ t: "logout" })} />
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
