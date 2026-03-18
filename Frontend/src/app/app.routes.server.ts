import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'orders/:id',
    renderMode: RenderMode.Client // ✅ FIX (exclude from prerender)
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender // keep prerender for rest
  }
];