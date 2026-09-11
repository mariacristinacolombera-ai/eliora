Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing url" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    let parsedUrl: URL;

try {
  parsedUrl = new URL(url);
} catch {
  return new Response(
    JSON.stringify({ error: "Invalid url" }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

if (
  parsedUrl.protocol !== "http:" &&
  parsedUrl.protocol !== "https:"
) {
  return new Response(
    JSON.stringify({ error: "Unsupported url protocol" }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

const hostname = parsedUrl.hostname.toLowerCase();

const blockedHostnames = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
]);

if (
  blockedHostnames.has(hostname) ||
  isPrivateIpv4(hostname)
) {
  return new Response(
    JSON.stringify({ error: "Local urls are not allowed" }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

    const response = await fetch(url);

const html = await response.text();

const jsonLdMatches = [
  ...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  ),
];

const jsonLdDocuments = jsonLdMatches
  .map((match) => match[1])
  .map((content) => {
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  })
  .filter((value) => value !== undefined);

function findRecipeNode(value: unknown): unknown | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];

  if (
    type === "Recipe" ||
    (Array.isArray(type) && type.includes("Recipe"))
  ) {
    return record;
  }

  const graph = record["@graph"];

  if (graph) {
    return findRecipeNode(graph);
  }

  return undefined;
}

const recipeNode = jsonLdDocuments
  .map((document) => findRecipeNode(document))
  .find((node) => node !== undefined);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractImageUrl(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractImageUrl(item);
      if (url) return url;
    }

    return undefined;
  }

  const record = asRecord(value);

  if (!record) {
    return undefined;
  }

  return (
    asString(record.url) ??
    asString(record.contentUrl)
  );
}

function extractInstructionSteps(value: unknown): string[] {
  if (typeof value === "string") {
    const step = value.trim();
    return step ? [step] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const steps: string[] = [];

  for (const item of value) {
    if (typeof item === "string") {
      const step = item.trim();

      if (step) {
        steps.push(step);
      }

      continue;
    }

    const record = asRecord(item);

    if (!record) {
      continue;
    }

    const type = record["@type"];

    if (
      type === "HowToSection" ||
      (Array.isArray(type) && type.includes("HowToSection"))
    ) {
      steps.push(...extractInstructionSteps(record.itemListElement));
      continue;
    }

    const text = asString(record.text);

    if (text) {
      steps.push(text);
    }
  }

  return steps;
}

function isoDurationToMinutes(value: unknown): number | undefined {
  const duration = asString(value);
  if (!duration) return undefined;

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(duration);
  if (!match) return undefined;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);

  return hours * 60 + minutes;
}

function splitRecipeYield(value: unknown): {
  servings?: string;
  yield?: string;
} {
  const text = asString(value);

  if (!text) {
    return {};
  }

  if (/^\d+(?:[.,]\d+)?$/.test(text)) {
    return {
      servings: text,
    };
  }

  return {
    yield: text,
  };
}

const recipe = asRecord(recipeNode);

const parsedYield = splitRecipeYield(recipe?.recipeYield);

const draft = recipe
  ? {
      title: asString(recipe.name),
      description: asString(recipe.description),

      servings: parsedYield.servings,
      yield: parsedYield.yield,

      prepMinutes: isoDurationToMinutes(recipe.prepTime),
      cookMinutes: isoDurationToMinutes(recipe.cookTime),

      ingredients: asStringArray(recipe.recipeIngredient),
      steps: extractInstructionSteps(recipe.recipeInstructions),

      sourceUrl: url,

      imageUrl: extractImageUrl(recipe.image),

    }
  : undefined;

return new Response(
  JSON.stringify({
    url,
    status: response.status,
    contentType: response.headers.get("content-type"),
    length: html.length,
    jsonLdCount: jsonLdMatches.length,
    hasRecipe: Boolean(recipeNode),
    draft,
  }),
  {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  },
);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});