import Modal from "../common/Modal";

export default function DeleteModal({ onCancel, onConfirm }) {
  return (
    <Modal title="Delete this item?" sub="This can't be undone." onClose={onCancel}>
      <div className="row2"><button className="btn line" onClick={onCancel}>Cancel</button><button className="btn red" onClick={onConfirm}>Delete</button></div>
    </Modal>
  );
}
