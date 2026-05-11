// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

//components
import About from './components/About';
import Privacy from './components/Privacy';
import Landing from './components/Landing';
import RecipeRecommendation from './components/RecipeRecommendation';
import Terms from './components/Terms';
import Fullcontact from './components/Fullcontact';
import MainLayout from './Layout/MainLayout';
import BasicLayout from './Layout/BasicLayout';
import Feedback from './components/Feedback';
import Minimal from './Layout/Minimal';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import ProfileLayout from './Layout/ProfileLayout';
import Editprofile from './components/EditProfile';
import Form from './components/Form';
import Feed from './components/Feed';
import SecondScroll from './components/SecondScroll';


function App() {
  return (
    <Router>
      <Routes>
        {/* Routes with MainLayout (Navbar and Footer visible) */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Landing />
            </MainLayout>
          }
        />
        <Route
          path="/recommend"
          element={
            <MainLayout>
              <RecipeRecommendation />
            </MainLayout>
          }
        />

        {/* Routes with BasicLayout (Navbar and Footer hidden) */}
        {/* <Route
          path="/aboutus"
          element={
            <MainLayout>
              <About />
            </MainLayout>
          }
        /> */}
        <Route
          path="/privacy"
          element={
            <BasicLayout>
              <Privacy />
            </BasicLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <BasicLayout>
              <Terms />
            </BasicLayout>
          }
        />
        <Route
          path="/contactUs"
          element={
            <MainLayout>
              <Fullcontact />
            </MainLayout>
          }
        />
        <Route
          path="/secondscroll"
          element={
            <Minimal>
              <SecondScroll />
            </Minimal>
          }
        />
        <Route
          path="/donationform"
          element={
            <Minimal>
              <Form />
            </Minimal>
          }
        />
        <Route
          path="/feedback"
          element={
            <Minimal>
              <Feedback />
            </Minimal>
          }
        />
        <Route
          path="/signup"
          element={
            <Minimal>
              <Signup/>
            </Minimal>
          }
        />
        <Route
          path="/login"
          element={
            <Minimal>
              <Login/>
            </Minimal>
          }
        />
         <Route
          path="/profile"
          element={
            <ProfileLayout>
              <Profile />
            </ProfileLayout>
          }
        />
        <Route
          path="/editprofile"
          element={
            <Minimal>
              <Editprofile />
            </Minimal>
          }
        />
        <Route
          path="/feed"
          element={
            <MainLayout>
              <Feed />
            </MainLayout>
          }
        /> 
      </Routes>
    </Router>
  );
}

// function App(){
//   return(
//     <Feedback/>
//   )
// }

export default App;
