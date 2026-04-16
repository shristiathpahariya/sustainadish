import React from "react";
import "../About.css";
import Neha from "../../Memberspic/Neha.jpg";
import Nitu from "../../Memberspic/Nitu.jpg";
import Aayushma from "../../Memberspic/Aayushma.jpg";
import Rajita from "../../Memberspic/Rajita.jpg";
import Shristi from "../../Memberspic/Shristi.jpg";

const TEAM = [
  { name: "Neha", image: Neha },
  { name: "Nitu", image: Nitu },
  { name: "Aayushma", image: Aayushma },
  { name: "Rajita", image: Rajita },
  { name: "Shristi", image: Shristi },
];

const About = () => {
  return (
    <section className="about-page" aria-label="About SustainaDish">
      <div className="about-page__inner">
        <header className="about-page__hero">
          <p className="about-page__eyebrow">Our story</p>
          <h1 className="about-page__title">About SustainaDish</h1>
          <p className="about-page__lede">
            We connect people who have surplus food with neighbors who can use it—cutting waste,
            sharing recipes, and building a kinder community around the table.
          </p>
        </header>

        <div className="about-page__separator" aria-hidden="true">
          <div className="about-page__sep-line" />
          <div className="about-page__sep-diamond" />
          <span className="about-page__sep-label">Why we exist</span>
          <div className="about-page__sep-diamond" />
          <div className="about-page__sep-line" />
        </div>

        <div className="about-page__story">
          <div className="about-page__card">
            <h2 className="about-page__card-title">Less waste, more sharing</h2>
            <p>
              SustainaDish started from a simple idea: good food shouldn&apos;t end up in the bin
              when someone nearby would happily enjoy it. We combine practical donation tools with
              inspiration to cook with what you already have—so surplus becomes opportunity, not
              trash.
            </p>
            <p>
              Whether you&apos;re listing a donation, browsing the feed, or exploring recipes for
              leftovers, you&apos;re part of a community that cares about sustainability and each
              other.
            </p>
          </div>
        </div>

        <section className="about-page__team-section" aria-labelledby="about-team-heading">
          <h2 id="about-team-heading" className="about-page__team-heading">
            Meet the team
          </h2>
          <p className="about-page__team-sub">
            The people behind SustainaDish—building the product and growing the mission.
          </p>
          <ul className="about-page__team-grid">
            {TEAM.map((member) => (
              <li key={member.name} className="about-page__member">
                <div className="about-page__member-frame">
                  <img
                    src={member.image}
                    alt=""
                    className="about-page__member-photo"
                    loading="lazy"
                  />
                </div>
                <p className="about-page__member-name">{member.name}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
};

export default About;
