import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const MainLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}  {/* Render the children components */}
      <Footer />
    </>
  );
};

export default MainLayout;
