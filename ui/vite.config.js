import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'plugin') {
    return {
      esbuild: { jsxFactory: 'host.h', jsxFragment: 'host.React.Fragment' },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: 'src/plugin.jsx',
          formats: ['es'],
          fileName: () => 'mcp-tools.js',
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
        },
      },
    };
  }
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: false,
    },
  };
});
