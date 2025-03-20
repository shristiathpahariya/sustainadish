import React from 'react';
import ReactDOM from 'react-dom';
import '../.././src/Popup.css'

const Popup = ({ isOpen, onRequestClose, children, className, overlayClassName }) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onRequestClose(); // Close popup on "Escape"
    }
  };

  return ReactDOM.createPortal(
    <div 
      className={overlayClassName} 
      onClick={onRequestClose} 
      onKeyDown={handleKeyDown} 
      tabIndex={-1} // Allow focusing for keyboard events
    >
      <div className={className} onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onRequestClose}>×</button>
        {children}
      </div>
    </div>,
    document.body
  );
};


export default Popup;
