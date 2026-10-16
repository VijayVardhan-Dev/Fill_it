import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  manifest: {
    permissions: ['storage', 'tabs', 'activeTab'],
  },
  modules: ['@wxt-dev/module-react'],
  // Tailwind is compiled by Vite; content-script CSS is injected into its UI
  // Shadow Root by WXT rather than added to the host page.
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
