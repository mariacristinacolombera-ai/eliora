import "./RecipeHeroCard.css";

type RecipeHeroCardProps = {
  title: string;
  preparedAt: Date;
  memory: string;
};

export default function RecipeHeroCard({
  title,
  preparedAt,
  memory,
}: RecipeHeroCardProps) {
  const formattedDate = preparedAt.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="recipe-hero">
      <p className="recipe-hero__eyebrow">L’ultima volta</p>

      <h2 className="recipe-hero__title">{title}</h2>

      <p className="recipe-hero__date">
        Preparata il {formattedDate}
      </p>

      <p className="recipe-hero__memory">“{memory}”</p>

      <div className="recipe-hero__actions">
        <button
          className="recipe-hero__button recipe-hero__button--primary"
          type="button"
        >
          Apri
        </button>

        <button
          className="recipe-hero__button recipe-hero__button--secondary"
          type="button"
        >
          Ricorda
        </button>
      </div>
    </article>
  );
}