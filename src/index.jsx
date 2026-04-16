// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { UserProvider } from './UserContext';
import { MessageDialogProvider } from './context/MessageDialogContext';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <UserProvider>
      <MessageDialogProvider>
        <App />
      </MessageDialogProvider>
    </UserProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
