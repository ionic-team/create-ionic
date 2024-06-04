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

import { existsSync } from 'node:fs';
import { mkdir, rm, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { parseArgs } from 'node:util';

import fetch from 'node-fetch';
import tar from 'tar';
import { ProjectSchema } from './types';
import { addCapacitorToPackageJson, initCapacitor } from './capacitor';
import { isGitInstalled, setupGit } from './git';
import { installDeps, modifyPackageJson } from './npm';

const pwd = process.cwd();
const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';
const s = spinner();

const { values, tokens, positionals } = parseArgs({
  allowPositionals: true,
  tokens: true,
  options: {
    type: { type: 'string' },
    capacitor: { type: 'boolean', default: true },
    deps: { type: 'boolean', default: true },
    git: { type: 'boolean', default: true },
    'no-capacitor': { type: 'boolean' },
    'no-deps': { type: 'boolean' },
    'no-git': { type: 'boolean' },
  },
});

tokens
  .filter((token) => token.kind === 'option')
  .forEach((token) => {
    if ('name' in token) {
      if (token.name.startsWith('no-')) {
        // Get the positive name but dropping the 'no-'
        const positiveName = token.name.slice(3) as keyof typeof values;
        if (positiveName !== 'type') {
          values[positiveName] = false;
          delete values[token.name];
        }
      } else {
        if (token.name !== 'type') {
          values[token.name] = token.value ?? true;
        }
      }
    }
  });

let projectSchema: Partial<ProjectSchema> = {};

async function main() {
  intro('Create Ionic App');
  const prompt = await group(
    {
      appName: async () => await getAppName(),
      framework: async () => await getFramework(),
      template: async () => await getTemplate(),
    },
    {
      onCancel: () => {
        exitProcess();
      },
    },
  );

  projectSchema = {
    appName: prompt.appName,
    framework: prompt.framework,
    template: prompt.template,
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
    console.error('[ERROR]: Something happened', e);
    return;
  }

  await removeStarterManifest();
  await modifyPackageJson(projectSchema);

  if (values.capacitor) {
    await addCapacitorToPackageJson(projectSchema);
  }

  if (values.deps) {
    s.start('Install Dependencies');
    await installDeps(projectSchema);
    s.stop('Installed');
  }

  if(values.capacitor){
    s.start('Setting up Capacitor');
    await initCapacitor(projectSchema);
    s.stop('Capacitor initiated')
  }

  // Init Git Last
  if (values.git && (await isGitInstalled())) {
    s.start('Setting up Git');
    await setupGit(projectSchema);
    s.stop('Git initialized');
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
  const nameArg = positionals[0];
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
  const frameworkArg = values.type;
  return (
    frameworkArg ||
    (await select({
      message: 'Pick a project type.',
      options: [
        { value: 'angular', label: 'Angular', hint: 'angular.dev' },
        { value: 'react', label: 'React', hint: 'react.dev' },
        { value: 'vue', label: 'Vue', hint: 'vuejs.org' },
      ],
    }))
  );
}

async function getTemplate() {
  const templateArg = positionals[1];
  return (
    templateArg ||
    (await select({
      message: 'Pick a starting template.',
      options: [
        {
          value: 'blank',
          label: 'blank',
          hint: 'A blank canvas'
        },
        {
          value: 'list',
          label: 'list',
          hint: 'A simple list'
        },
        {
          value: 'sidemenu',
          label: 'sidemenu',
          hint: 'Side menu with navigation in the content area'
        },
        {
          value: 'tabs',
          label: 'tabs',
          hint: 'A simple tabbed interface'
        },
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
    'ionic.starter.json',
  );
  await unlink(manifestPath);
}

function exitProcess(message = 'Operation cancelled.') {
  cancel(message);
  process.exit(0);
}

function onSuccess() {
  note(
    `Next Steps:\ncd ${projectSchema.appName}\nnpm run ionic:serve`,
    'Project Created 🚀 ',
  );
  outro('Happy Hacking 🤓');
}

main().catch((e) => {
  console.error(e);
});
