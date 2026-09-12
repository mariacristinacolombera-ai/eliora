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

 let body: unknown;

try {
  body = await req.json();
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

const bodyRecord = asRecord(body);
const url = asString(bodyRecord?.url);

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

try {
  const validatedUrl = validateImportUrl(url);

  if (!validatedUrl.ok) {
    return new Response(
      JSON.stringify({ error: validatedUrl.error }),
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

   let currentUrl = url;
let response: Response;

for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
  const validatedCurrentUrl = validateImportUrl(currentUrl);

  if (!validatedCurrentUrl.ok) {
    return new Response(
      JSON.stringify({ error: validatedCurrentUrl.error }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  response = await fetch(currentUrl, {
    redirect: "manual",
  });

  if (!isRedirectStatus(response.status)) {
    break;
  }

  const location = response.headers.get("location");

  if (!location) {
    return new Response(
      JSON.stringify({ error: "Redirect without location" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  currentUrl = new URL(location, currentUrl).toString();

  if (redirectCount === 3) {
    return new Response(
      JSON.stringify({ error: "Too many redirects" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

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

function validateImportUrl(rawUrl: string): {
  ok: true;
  url: URL;
} | {
  ok: false;
  error: string;
} {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      error: "Invalid url",
    };
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    return {
      ok: false,
      error: "Unsupported url protocol",
    };
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
    return {
      ok: false,
      error: "Local urls are not allowed",
    };
  }

  return {
    ok: true,
    url: parsedUrl,
  };
}

function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

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
  } catch (error) {
  console.error("import-recipe failed", error);

  return new Response(
    JSON.stringify({
      error: "Import failed",
      detail:
        error instanceof Error
          ? error.message
          : String(error),
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
});