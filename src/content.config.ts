import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const writingCategories = ['仏教', '日々', '技術'] as const;

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    category: z.enum(writingCategories),
    draft: z.boolean().default(true),
  }),
});

export const collections = { writing };
