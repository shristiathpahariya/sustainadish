import React from 'react';
import Navbar from '../components/Navbar';

const ProfileLayout = ({ children }) => {
    return (
        <>
          <Navbar />
          {children}  {/* Render the children components */}
</>
      );
    };

export default ProfileLayout;
