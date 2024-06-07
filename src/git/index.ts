import { checkCmd, runShell } from '../shell';
import { ProjectSchema } from '../types';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
export async function setupGit(projectSchema: ProjectSchema) {
  const shellOptions = {
    cwd: resolve(cwd(), projectSchema.appName as string),
  };

  await runShell('git', ['init'], shellOptions);
  await runShell('git', ['add', '-A'], shellOptions);
  await runShell( 'git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions);
}

export async function isGitInstalled(): Promise<boolean> {
  return await checkCmd('git', ['--version'], {});
}
