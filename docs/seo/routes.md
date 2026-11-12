# Freemy language and route policy

- The English home is `/`; the Chinese home is `/zh/`.
- Chinese content paths remain `/works/…/`, `/collections/…/`, `/types/…/`, `/categories/…/` and `/explore/`. Their English counterparts start with `/en/`.
- Language switches retain the corresponding content, query and fragment. A saved preference does not silently redirect the root home.
- Vercel is configured to permanently redirect the exact `/en` home alias to `/`, and to use trailing slashes for content paths. These are deployment rules; their actual behavior must be checked on a Vercel deployment, including `/en/`, queries and English detail pages.
- Filtering parameters are user interface state, not separate canonical pages.
