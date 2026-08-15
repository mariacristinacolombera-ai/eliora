import "./RecipeSearch.css";

type RecipeSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function RecipeSearch({
  value,
  onChange,
}: RecipeSearchProps) {
  return (
    <div className="recipe-search">
      <input
        className="recipe-search__input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cerca una ricetta..."
      />
    </div>
  );
}