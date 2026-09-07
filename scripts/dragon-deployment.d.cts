export interface DragonBuild { readonly id: string; readonly revision: string }
export interface DeploymentIdentity { readonly dragon: string; readonly revision: string; readonly deployment: string }
export interface DragonServiceRelease {
  readonly image: string;
  readonly port: number;
  readonly environment: Readonly<Record<string, string>>;
  readonly secrets: Readonly<Record<string, string>>;
}
export interface DragonRelease {
  readonly version: 1;
  readonly dragon: string;
  readonly environment: 'test' | 'production';
  readonly revision: string;
  readonly configurationVersion: string;
  readonly dataVolume: string;
  readonly frontend: DragonServiceRelease;
  readonly backend: DragonServiceRelease;
}
export function validateRelease(value: unknown): DragonRelease;
export function readRelease(file: string): DragonRelease;
export function readBuild(file: string): DragonBuild;
export function assertSafeRuntimeEnvironment(environment: Readonly<Record<string, string | undefined>>): void;
export function backendEnvironmentIssues(domain: 'casedata' | 'supportmanagement', environment: Readonly<Record<string, string | undefined>>): { missing: string[]; invalid: string[] };
export function deploymentIdentity(release: DragonRelease): DeploymentIdentity;
export function runtimeEnvironment(side: 'frontend' | 'backend', build: DragonBuild, release: DragonRelease, inherited: NodeJS.ProcessEnv, secretDirectory: string): NodeJS.ProcessEnv;
