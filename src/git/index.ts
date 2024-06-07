import { runShell } from '../shell';
import { ProjectSchema } from '../types';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
export async function setupGit(projectSchema: ProjectSchema) {
  const shellOptions = {
    cwd: resolve(cwd(), projectSchema.appName as string),
  };
  
  const initRes =  await runShell('git', ['init'], shellOptions)
  const addRes =  await runShell('git', ['add', '-A'], shellOptions)
  const commmitRes =  await runShell( 'git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions,)
  console.log(initRes, addRes, commmitRes)
}

export async function isGitInstalled(): Promise<boolean> {
  try {
    await runShell('git', ['--version'], {});
    return true;
  } catch (_e) {
    return false;
  }

  // if(status === 0){
  //   return true;
  // }
  // return false;
}
