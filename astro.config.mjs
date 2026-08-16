// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog'
import sitemap from '@astrojs/sitemap';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
    site: 'https://docs.loutik.fr',
    integrations: [
        mermaid({
        autoTheme: true, // Aligne automatiquement la couleur du graphique sur le mode clair/sombre de Starlight
        }),
        starlight({
        title: 'LoutikDOCS ',
        lastUpdated: true,
		components: {
            Footer: './src/components/Footer.astro',
            SiteTitle: './src/components/SiteTitle.astro',
		},
        head: [
            {
                tag: 'meta',
                attrs: { property: 'og:image', content: 'https://docs.loutik.fr/loutikdocs-social-card.png' }
            },
        ],
        social: [
            { icon: 'linkedin', label: 'LinkInd', href: 'https://www.linkedin.com/in/louismedo/'},
            { icon: 'discord', label: 'Discord', href: 'https://discord.loutik.fr'},
            { icon: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@FireToak'},
            { icon: 'github', label: 'GitHub', href: 'https://github.com/FireToak' },
            ],
        sidebar: [
			{
				label: 'Bienvenue 👋',
				slug: 'introduction/bienvenue'
			},
            {
                label: '🏠 Homelab',
                collapsed: true,
                items: [{ autogenerate: { directory: 'homelab', collapsed: true } }],
            },
			{
                label: '📚 Notions',
                collapsed: true,
                items: [{ autogenerate: { directory: 'notions', collapsed: true } }],
            },
			{
                label: '📖 Projets BTS SIO',
                collapsed: true,
                items: [{ autogenerate: { directory: 'projets-bts-sio', collapsed: true } }],
            },
        ],
		plugins: [
			starlightBlog({
			title: 'Blog',
			authors: {
				louismedo: {
				name: 'Louis MEDO',
				title: 'Étudiant BTS SIO / Administration système',
				picture: 'https://github.com/FireToak.png',
				},
			}
			}),
		],
		}), sitemap()],
});