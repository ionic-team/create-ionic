import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runShell } from '../shell';
import { ProjectSchema } from '../types';

export function getPackageManager(): string {
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';
  return pkgManager;
}

export function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

export async function installDeps(projectSchema: ProjectSchema) {
  const pkgMgmt = getPackageManager();
  await runShell(pkgMgmt, ['install'], {
    cwd: resolve(process.cwd(), projectSchema.appName as string),
    stdio: 'pipe'
  });
}

export async function modifyPackageJson(projectSchema: ProjectSchema) {
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
  projectPackage.name = projectSchema.appName;

  await writeFile(packagePath, JSON.stringify(projectPackage, null, 2));
}
