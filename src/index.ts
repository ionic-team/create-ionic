import {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';

import { SpawnOptions, execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

import { parseArgs } from 'node:util';

import fetch from 'node-fetch';
import tar from 'tar';

const pwd = process.cwd();
const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';
const s = spinner();

const args = parseArgs({
  options: {
    type: {
      type: 'string',
    },
    git: {
      type: 'string',
      default: 'true',
    },
  },
  allowPositionals: true,
});

interface ProjectSchema {
  appName?: string;
  framework?: 'angular' | 'vue-vite' | 'react-vite' | string;
  template?: 'blank' | 'sidemenu' | 'tabs' | string;
  git?: boolean;
}
let projectSchema: Partial<ProjectSchema> = {};

async function main() {
  intro('Create Ionic App');
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
    git: args.values.git === 'true',
  };

  if (prompt.framework === 'react' || prompt.framework === 'vue') {
    projectSchema.framework = `${prompt.framework}-vite`;
  }
  if (prompt.framework === 'angular') {
    await shouldUseStandAlone();
  }

  if (existsSync(prompt.appName)) {
    await handleExistingDirectory(prompt.appName);
  }

  const url = `${STARTER_BASE_URL}/${projectSchema.framework}-official-${projectSchema.template}.tar.gz`;
  const projectDir = resolve(pwd, prompt.appName);

  await mkdir(projectDir);

  try {
    await downloadAndExtract(url, projectDir);
  } catch (e) {
    console.error(`[ERROR]: Something happened`, e);
    return;
  }

  await removeStarterManifest();
  await addIonicScripts();

  if (prompt.shouldAddCap) {
    await addCapacitorToPackageJson();
  }

  if (prompt.shouldInstallDeps) {
    await installDeps();
  }

  // Init Git Last
  const gitStatus = projectSchema.git && (await isGitInstalled());
  if (gitStatus) {
    await setupGit();
  }
  onSuccess();
}

const downloadAndExtract = async (url: string, projectDir: string) => {
  const unzip = tar.extract({ cwd: projectDir });
  const input = await fetch(url);
  if (input.body) {
    await pipeline(input.body, unzip);
  }
};

async function getAppName() {
  const nameArg = args.positionals[0];
  return (
    nameArg ||
    (await text({
      message: 'What is the name of your project?',
      placeholder: 'my-app',
      validate(value) {
        if (value.length === 0) return 'Value is required!';
      },
    }))
  );
}
async function getFramework() {
  const frameworkArg = args.values.type;
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
  const templateArg = args.positionals[1];
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

async function shouldUseStandAlone() {
  const useStandalone = await confirm({
    message: 'Do you want to use Standalone components?',
  });
  if (isCancel(useStandalone)) exitProcess();
  if (useStandalone) {
    projectSchema.framework = `${projectSchema.framework}-standalone`;
  }
}
async function handleExistingDirectory(path: string) {
  const shouldDelete = await confirm({
    message: `./${path} already exist, Overwrite?`,
  });
  if (isCancel(shouldDelete)) exitProcess();
  shouldDelete
    ? await deleteDir(path)
    : exitProcess(`Not erasing project in ${path}`);
}
async function deleteDir(path: string) {
  s.start('Removing Existing Project');
  await rm(path, { recursive: true, force: true });
  s.stop('Removed 👋');
}
async function removeStarterManifest() {
  const manifestPath = resolve(
    projectSchema.appName as string,
    'ionic.starter.json'
  );
  await unlink(manifestPath);
}
async function addIonicScripts() {
  const scriptsToAdd: { [key: string]: string } = {
    'ionic:build': 'npm run build',
  };
  projectSchema.framework === 'angular' ||
    projectSchema.framework === 'angular-standalone';
  if (
    projectSchema.framework === 'angular' ||
    projectSchema.framework === 'angular-standalone'
  ) {
    scriptsToAdd['ionic:serve'] = 'npm run start -- --open';
  } else {
    scriptsToAdd['ionic:serve'] = 'npm run dev -- --open';
  }

  const packagePath = resolve(projectSchema.appName as string, 'package.json');
  const projectPackage = JSON.parse(await readFile(packagePath, 'utf-8'));

  projectPackage.scripts = { ...projectPackage.scripts, ...scriptsToAdd };
  await writeFile(packagePath, JSON.stringify(projectPackage, null, 2));
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
  const packagePath = resolve(projectSchema.appName as string, 'package.json');
  const projectPackage = JSON.parse(await readFile(packagePath, 'utf-8'));
  projectPackage.dependencies = { ...projectPackage.dependencies, ...appDeps };
  projectPackage.devDependencies = {
    ...projectPackage.devDependencies,
    ...devDeps,
  };

  await writeFile(packagePath, JSON.stringify(projectPackage, null, 2));
}
async function runShell(
  cmd: string,
  arg1: string[],
  shellOptions: SpawnOptions
): Promise<void> {
  await new Promise<void>((resolve) => {
    const cp = spawn(cmd, arg1, shellOptions);
    cp.on('close', () => {
      resolve();
    });
  });
}
async function setupGit() {
  const shellOptions = {
    cwd: resolve(pwd, projectSchema.appName as string),
  };
  s.start('Setting up Git');
  await runShell('git', ['init'], shellOptions);
  await runShell('git', ['add', '-A'], shellOptions);
  await runShell('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], {
    cwd: shellOptions.cwd,
  });
  s.stop('Git initialized');
}
async function installDeps() {
  const pkgMgmt = await getPackageManager();
  s.start('Install Dependencies');
  await runShell(pkgMgmt, ['install'], {
    cwd: resolve(pwd, projectSchema.appName as string),
  });
  s.stop('Installed');
}
async function isGitInstalled(): Promise<boolean> {
  return await new Promise<boolean>((res, rej) => {
    execFile('git', ['--version'], (error) => {
      if (error) {
        rej(false);
      } else {
        res(true);
      }
    });
  });
}
async function getPackageManager(): Promise<string> {
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';
  return pkgManager;
}
function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

function exitProcess(message = 'Operation cancelled.') {
  cancel(message);
  process.exit(0);
}
function onSuccess() {
  note(
    `Next Steps:\ncd ${projectSchema.appName}\nnpm run ionic:serve`,
    'Project Created 🚀 '
  );
  outro('Happy Hacking 🤓');
}
main().catch((e) => {
  console.error(e);
});
