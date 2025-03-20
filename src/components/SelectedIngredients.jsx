import React from 'react';

function SelectedIngredients({ ingredients, onRemoveIngredient }) {
  return (
    <div className="selected-ingredients">
      <h3>Your selected ingredients</h3>
      <div className='ingredientselected'>
      <p>
        {ingredients.map((ingredient, index) => (
          <p key={index}>
            <button onClick={() => onRemoveIngredient(ingredient)} className='cross'>{ingredient} x</button>
          </p>
        ))}
      </p>
      </div>
    </div>
  );
}

export default SelectedIngredients;