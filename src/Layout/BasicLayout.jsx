import React from 'react';
import Footer from '../components/Footer';

const BasicLayout = ({ children }) => {
  return (
    <>
      {children}  {/* Render the children components */}
      <Footer/>
    </>
  );
};

export default BasicLayout;
