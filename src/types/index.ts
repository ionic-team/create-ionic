export interface ProjectSchema {
  appName?: string;
  framework?: 'angular' | 'vue-vite' | 'react-vite' | string;
  template?: 'blank' | 'sidemenu' | 'tabs' | 'list' | string;
  packageId?: string;
}

export interface SpinnerType {
    start: (msg?: string | undefined) => void;
    stop: (msg?: string | undefined, code?: number | undefined) => void;
    message: (msg?: string | undefined) => void;
}
