const defaulDist: Record<string, string> = {
  angular: 'www',
  vue: 'build',
  react: 'build',
  'angular-standalone': 'www',
  'vue-vite': 'dist',
  'react-vite': 'dist',
};

export const getDefaultDist = (framework: string) => defaulDist[framework];
