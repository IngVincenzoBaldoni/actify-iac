import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';

interface ArticleEntry {
  article_number: number;
  article_title:  string;
  text:           string;
}

// Loaded once at cold-start — 396KB JSON, negligible overhead
const ARTICLES: Record<string, ArticleEntry> = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/ai-act-articles.json'), 'utf-8')
);

// GET /api/articles/{articleNum}  (public — AI Act text is publicly available)
export async function getArticleText(event: APIGatewayProxyEventV2) {
  const seg = event.requestContext.http.path.split('/').pop() ?? '';
  const num = parseInt(seg, 10);
  if (!num || isNaN(num)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_article_number' }) };
  }

  const article = ARTICLES[String(num)];
  if (!article) {
    return { statusCode: 404, body: JSON.stringify({ error: 'article_not_found', article_number: num }) };
  }

  // Strip "Articolo N\nTitle\n\n" prefix — the title is returned separately
  const bodyText = article.text
    .replace(new RegExp(`^Articolo ${num}\\s*\\n[^\\n]*\\n+`), '')
    .trim();

  return {
    statusCode: 200,
    body: JSON.stringify({
      article_number: article.article_number,
      article_title:  article.article_title,
      text:           bodyText,
      parts_count:    1,
    }),
  };
}
