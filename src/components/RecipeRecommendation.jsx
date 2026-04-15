import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { mlApiUrl } from '../config';
import '../.././src/receipe.css';

const RecipeRecommendation = () => {
  const navigate = useNavigate()

  const handleClick=()=>{
    navigate('/')
  }

  const [ingredients, setIngredients] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [resultsLoaded, setResultsLoaded] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRecipes([]);
    setResultsLoaded(false);

    try {
      const response = await fetch(`${mlApiUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ ingredients }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'An error occurred. Please try again.');
        return;
      }
  
      const data = await response.json();

      if (response.ok) {
        setRecipes(data);
        setResultsLoaded(true); // Show results, hide media
      } else {
        setError(data.message);
        setResultsLoaded(false); // Keep media visible
      }
      setRecipes(data);
    } catch (err) {
      setError('Please input valid ingredient name.');
    }
  };

  const displayResults = () => {
    // if (recipes.length === 0) {
    //   return <p className='initial'>No recommendations found. Try entering different ingredients.</p>;
    // }

  
  
    return recipes.map((recipe, index) => (
      <div key={index} className="recipe">
        <h2>{recipe.Title}</h2>
        <h4>Ingredients:</h4>
        <ul>
          {splitIngredients(recipe.Ingredients).map((ingredient, i) => (
            <li key={i} className='renderIngredients'>{ingredient}</li>
          ))}
        </ul>
        <h4>Instructions:</h4>
        <ol>
          {splitInstructions(recipe.Instructions).map((step, i) => (
            <li key={i} className="instructions">{step}</li>
          ))}
        </ol>
      </div>
    ));
  };
  
  
  // Function to split ingredients correctly into list items
  const splitIngredients = (ingredients) => {
    if (typeof ingredients === 'string') {
      return ingredients
      .replace(/\d+\.\s/g, '') // Removes existing numbers in instructions
      .split(/[.!?]\s+/)        // Split by period, exclamation, or question marks followed by a space
      .filter(step => step);    // Removes any empty steps
    }
    return ingredients; // If already an array
  };
  
  // Utility function to handle better splitting of instructions
  const splitInstructions = (instructions) => {
    return instructions
      .replace(/\d+\.\s/g, '') // Removes existing numbers in instructions
      .split(/[.!?]\s+/)        // Split by period, exclamation, or question marks followed by a space
      .filter(step => step);    // Removes any empty steps
  };
  
  

  return (
    <div className="getreceipe">
      <h1>Recipe Recommendation</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="ingredients" className='enter'>Enter ingredients (comma separated):</label>
          <input
            type="text"
            id="ingredients"
            name="ingredients"
            className='ingredient'
            placeholder="e.g., tomato, cheese, basil"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            required
          />
        </div>
        <button type="submit" className='recommendationsubmit'>Get Recommendations</button>
      </form>

      <div className="results" id="results">
  {error && <li className="instructions">{error}</li>}
  {displayResults()}
</div>
      {/* Conditionally render the image or video */}
      {!resultsLoaded && (
      <div className="intro-media">
        <img src="public\rice.png" alt="Recipe Inspiration" />
        {/* Uncomment for video */}
        {/* <video width="600" controls> */}
        {/*   <source src="path_to_your_video.mp4" type="video/mp4" /> */}
        {/*   Your browser does not support the video tag. */}
        {/* </video> */}
      </div>
    )}
    </div>
  );
};

export default RecipeRecommendation;
