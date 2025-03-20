import React from 'react';
import '../.././src/About.css'
import Neha from "../../Memberspic/Neha.png"
import Nitu from "../../Memberspic/Nitu.png"
import Aayushma from "../../Memberspic/Aayushma.png"
import Rajita from "../../Memberspic/Rajita.png"
import Shristi from "../../Memberspic/Shristi.png"
const About = () => {
  return (
    <div className="aboutcontainer">
     
      <div className="about">
        <h2>About Us</h2>
        <p>
          At SustainADish, we believe in the power of good food and community. Our mission is to make cooking enjoyable, sustainable, and accessible to everyone. Whether you're a seasoned chef or just starting your culinary journey, SustainADish is here to inspire you with delicious recipes tailored to the ingredients you have on hand.
        </p>
        <p>
        SustainaDish is a web application designed to take the guesswork out of cooking. Simply input the ingredients you have, and we'll provide you with a variety of recipes that suit your needs. Our goal is to help you reduce food waste, save money, and discover new and exciting meals.
        In addition to recipe recommendations, we offer a unique donation service. Users can fill out a donation form to share extra ingredients or meals. This form creates a post about the donation, allowing other users to interact, respond, and benefit from the shared resources. This fosters a community of sharing and support.
        </p>
      </div>

      <div className="vision">
        <h2>Our Vision</h2>
        <p>
          We envision a world where cooking is a joyful and sustainable activity. By connecting people through food and fostering a culture of sharing, we hope to make a positive impact on both our community and the environment.
        </p>
      </div>

      <div className="team-section">
        <h2>Meet Our Team</h2>
        <p>At SustainaDish, we have a dedicated team working behind the scenes to bring you the best possible experience.</p>
        <div className="team">
          <div className="team-member">
            <img src={Neha} alt="Neha Shakya" />
            <h3>Neha Shakya</h3>
          </div>
          <div className="team-member">
            <img src={Shristi} alt="Shristi Atphahariya" />
            <h3>Shristi Atphahariya</h3>
          </div>
          <div className="team-member">
            <img src={Nitu} alt="Nitu Khadka" />
            <h3>Nitu Khadka</h3>
          </div>
          <div className="team-member">
            <img src={Aayushma} alt="Ayushma Maharjan" />
            <h3>Ayushma Maharjan</h3>
          </div>
          <div className='team-member'>
              <img src ={Rajita} alt="Rajita Shahi"/>
              <h4>Rajita Shahi</h4>
          </div>   
        </div>
        </div>
      

    </div>
  );
}

export default About;