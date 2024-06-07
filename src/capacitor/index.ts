import { ProjectSchema } from '../types';

import { readFile, writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { resolve } from 'node:path';
import { getPackageManager } from '../npm';
import { runShell } from '../shell';
import { getDefaultDist } from '../utils';

export async function addCapacitorToPackageJson(projectSchema: ProjectSchema) {
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

export async function initCapacitor(
  projectSchema: ProjectSchema,
) {
  let cmdPrefix = 'npx'
  const pkgMgmt = getPackageManager();
  if(pkgMgmt !== 'npm'){ cmdPrefix = pkgMgmt }
  cmdPrefix = platform() === 'win32' ? `${cmdPrefix}.cmd` : cmdPrefix;

  const name = projectSchema.appName as string;
  const packageId = projectSchema.packageId as string;
  const webDir = getDefaultDist(projectSchema.framework as string);

  const args = ['cap', 'init', name, packageId, '--web-dir', webDir]

  const shellOptions = { cwd: resolve(process.cwd(), projectSchema.appName as string), };
  await runShell( cmdPrefix, args, shellOptions,);
}
