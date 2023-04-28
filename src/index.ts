import {
  intro,
  outro,
  text,
  cancel,
  select,
  group,
  confirm,
  isCancel,
} from '@clack/prompts';
import minimist from 'minimist';
import fetch from 'node-fetch';
import tar from 'tar';

import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync, } from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { resolve } from 'node:path';

const pwd = process.cwd();
export const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';

const argv = minimist(process.argv.slice(2), { string: ['_'] });
interface ProjectSchema {
  appName?: string;
  framework?: 'angular' | 'vue' | 'react' | string;
  template?: 'blank' | 'sidemenu' | 'tabs' | string;
  git?: boolean;
}
let projectSchema: Partial<ProjectSchema> = {};

async function main() {
  intro(`Create Ionic App`);
  const prompt = await group(
    {
      appName: async () => await getAppName(),
      framework: async () => await getFramework(),
      template: async () => await getTemplate(),
      shouldAddCap: async () =>
        await confirm({ message: 'Add Capacitor to your project?' }),
      shouldInstallDeps: async () =>
        await confirm({ message: 'Install Deps?' }),
    },
    {
      onCancel: () => {
        exitProcess();
      },
    }
  );

  projectSchema = {
    appName: prompt.appName,
    framework: prompt.framework,
    template: prompt.template,
    git: argv.git || true,
  };
  if (
    projectSchema.framework === 'react' ||
    projectSchema.framework === 'vue'
  ) {
    projectSchema.framework = `${projectSchema.framework}-vite`;
  }

  if (existsSync(prompt.appName)) {
    await handleExistingDirectory(prompt.appName);
  }

  const url = `${STARTER_BASE_URL}/${projectSchema.framework}-official-${projectSchema.template}.tar.gz`;

  const dest = resolve(pwd, prompt.appName);
  mkdirSync(dest);
  await downloadAndExtract(url, dest);
  await cleanup();

  const shellOptions = {
    cwd: resolve(pwd, projectSchema.appName!),
    stdio: 'inherit',
  };

  if (prompt.shouldAddCap) await addCapacitorToPackageJson();
  if (prompt.shouldInstallDeps)
    await runShell('npm', ['install'], shellOptions);

  // Init Git Last
  if (projectSchema.git) {
    await runShell('git', ['init'], shellOptions);
    await runShell('git', ['add', '-A'], shellOptions);
    await runShell(
      'git',
      ['commit', '-m', 'Initial commit', '--no-gpg-sign'],
      shellOptions
    );
  }
  onSuccess();
}

const downloadAndExtract = async (url: string, path: string) => {
  const ws = tar.extract({ cwd: path });
  const response = await fetch(url);
  await pipeline(response.body!, ws);
};

async function getAppName() {
  const nameArg = argv._[0];
  return (
    nameArg ||
    (await text({
      message: 'What is the name of your project?',
      placeholder: 'my-app',
      validate(value) {
        if (value.length === 0) return `Value is required!`;
      },
    }))
  );
}
async function getFramework() {
  const frameworkArg = argv.type;
  return (
    frameworkArg ||
    (await select({
      message: 'Pick a project type.',
      options: [
        { value: 'angular', label: 'Angular | angular.io' },
        { value: 'react', label: 'React   | react.dev' },
        { value: 'vue', label: 'Vue     | vuejs.org' },
      ],
    }))
  );
}
async function getTemplate() {
  const templateArg = argv._[1];
  return (
    templateArg ||
    (await select({
      message: 'Pick a starting template.',
      options: [
        {
          value: 'tabs',
          label:
            'tabs         | A starting project with a simple tabbed interface',
        },
        {
          value: 'sidemenu',
          label:
            'sidemenu     | A starting project with a side menu with navigation in the content area',
        },
        { value: 'blank', label: 'blank        | A blank starter project' },
      ],
    }))
  );
}
function exitProcess(message = 'Operation cancelled.') {
  cancel(message);
  process.exit(0);
}
function onSuccess() {
  outro(
    `Project Created 🚀 

 Now you can run: 

 cd ${projectSchema.appName}
 npm run ionic:serve

 Happy Hacking 🤓`
  );
}
async function handleExistingDirectory(path: string) {
  const shouldDelete = await confirm({
    message: `./${path} already exist, Overwrite?`,
  });
  if (isCancel(shouldDelete)) exitProcess();
  shouldDelete
    ? rmSync(path, { recursive: true, force: true })
    : exitProcess(`Not erasing project in ${path}`);
}
async function cleanup() {
  const manifestPath = resolve(projectSchema.appName!, 'ionic.starter.json');
  unlinkSync(manifestPath);
}

async function addCapacitorToPackageJson() {
  const appDeps = {
    '@capacitor/app': 'latest',
    '@capacitor/core': 'latest',
    '@capacitor/keyboard': 'latest',
    '@capacitor/haptics': 'latest',
    '@capacitor/status-bar': 'latest',
  };
  const devDeps = { '@capacitor/cli': 'latest' };
  const packagePath = resolve(projectSchema.appName!, 'package.json');
  const projectPackage = JSON.parse(readFileSync(packagePath, 'utf-8'));
  projectPackage.dependencies = { ...projectPackage.dependencies, ...appDeps };
  projectPackage.devDependencies = {
    ...projectPackage.devDependencies,
    ...devDeps,
  };

  writeFileSync(packagePath, JSON.stringify(projectPackage, null, 2));
}

async function runShell(
  cmd: string,
  arg1: string[],
  shellOptions: any
): Promise<void> {
  await new Promise<void>((resolve) => {
    const cp = spawn(cmd, arg1, shellOptions);
    cp.on('close', () => {
      resolve();
    });
  });
}

main().catch(console.error);
