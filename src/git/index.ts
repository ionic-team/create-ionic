import { exec, runShell } from '../shell';
import { ProjectSchema } from '../types';
import { resolve } from 'node:path';
export async function setupGit(projectSchema: ProjectSchema) {
  const shellOptions = {
    cwd: resolve(process.cwd(), projectSchema.appName as string),
  };
  await runShell('git', ['init'], shellOptions);
  await runShell('git', ['add', '-A'], shellOptions);
  await runShell('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions);
}

export async function isGitInstalled(): Promise<boolean> {
  const res = await exec('git', ['--version']);
  if (res) {
    return true;
  }
  return false;
}
