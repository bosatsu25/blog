export type ProjectCategory = 'Frontend' | 'QA' | 'Minecraft' | 'Tooling';

export type Project = {
  name: string;
  description: string;
  categories: ProjectCategory[];
  technologies: string[];
  href?: string;
};

export const projects: Project[] = [
  {
    name: 'VoxelWeave',
    description: 'A Minecraft client-side tool focused on precise voxel editing workflows.',
    categories: ['Minecraft', 'Tooling'],
    technologies: ['Java', 'Fabric', 'JUnit'],
  },
  {
    name: 'Cele-Tweaks',
    description:
      'A lightweight multi-version Minecraft utility mod with a deliberately small scope.',
    categories: ['Minecraft', 'Tooling'],
    technologies: ['Java', 'Fabric', 'Gradle'],
  },
  {
    name: 'ReflowPress',
    description:
      'A content-oriented tool built with maintainability and automated quality gates in mind.',
    categories: ['Frontend', 'QA'],
    technologies: ['TypeScript', 'Testing', 'CI'],
  },
];
