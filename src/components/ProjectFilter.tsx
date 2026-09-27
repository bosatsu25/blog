import { useEffect, useMemo, useState } from 'react';
import type { Project, ProjectCategory } from '../data/projects';

const categories: Array<'All' | ProjectCategory> = [
  'All',
  'Frontend',
  'QA',
  'Minecraft',
  'Tooling',
];

export function ProjectFilter({ projects }: { projects: Project[] }) {
  const [selected, setSelected] = useState<(typeof categories)[number]>('All');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const visibleProjects = useMemo(
    () =>
      selected === 'All'
        ? projects
        : projects.filter((project) => project.categories.includes(selected)),
    [projects, selected],
  );

  return (
    <section aria-labelledby="projects-heading">
      <div className="project-filter" aria-label="Project categories">
        {categories.map((category) => (
          <button
            type="button"
            className={category === selected ? 'is-active' : undefined}
            aria-pressed={category === selected}
            onClick={() => setSelected(category)}
            disabled={!hydrated}
            data-hydrated={hydrated ? 'true' : 'false'}
            key={category}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="project-list" aria-live="polite">
        {visibleProjects.map((project) => (
          <article className="project" key={project.name}>
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <p className="project-meta">{project.technologies.join(' · ')}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
