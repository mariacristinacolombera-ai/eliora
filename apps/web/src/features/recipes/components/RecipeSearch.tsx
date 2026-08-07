import "./RecipeSearch.css";

export default function RecipeSearch() {
  return (
    <div className="recipe-search">
      <input
        className="recipe-search__input"
        type="text"
        placeholder="Cerca una ricetta..."
      />
    </div>
  );
}