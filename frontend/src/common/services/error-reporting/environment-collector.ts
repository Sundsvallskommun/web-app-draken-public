import { AppVersion, ClientEnvironment } from './types';

interface BrowserInfo {
  name: string;
  version: string;
}

export function parseBrowserInfo(userAgent: string): BrowserInfo {
  const browsers: { pattern: RegExp; name: string }[] = [
    { pattern: /Edg\/([\d.]+)/, name: 'Edge' },
    { pattern: /OPR\/([\d.]+)/, name: 'Opera' },
    { pattern: /Chrome\/([\d.]+)/, name: 'Chrome' },
    { pattern: /Firefox\/([\d.]+)/, name: 'Firefox' },
    { pattern: /Safari\/([\d.]+)/, name: 'Safari' },
  ];

  for (const { pattern, name } of browsers) {
    const match = userAgent.match(pattern);
    if (match) {
      return { name, version: match[1] };
    }
  }

  return { name: 'Unknown', version: '' };
}

export function parseOsInfo(userAgent: string): string {
  const osPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /Windows NT 10/, name: 'Windows 10/11' },
    { pattern: /Windows NT/, name: 'Windows' },
    { pattern: /Mac OS X ([\d_]+)/, name: 'macOS' },
    { pattern: /Linux/, name: 'Linux' },
    { pattern: /Android ([\d.]+)/, name: 'Android' },
    { pattern: /iPhone OS ([\d_]+)/, name: 'iOS' },
  ];

  for (const { pattern, name } of osPatterns) {
    const match = userAgent.match(pattern);
    if (match) {
      const version = match[1]?.replace(/_/g, '.') ?? '';
      return version ? `${name} ${version}` : name;
    }
  }

  return 'Unknown';
}

export function collectEnvironmentInfo(): ClientEnvironment {
  if (typeof window === 'undefined') {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      screenResolution: 'Unknown',
      viewportSize: 'Unknown',
      language: 'Unknown',
      userAgent: '',
    };
  }

  const ua = navigator.userAgent;
  const browser = parseBrowserInfo(ua);

  return {
    browser: `${browser.name} ${browser.version}`,
    os: parseOsInfo(ua),
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    userAgent: ua,
  };
}

let cachedAppVersion: AppVersion | null | undefined;

export async function getAppVersion(basePath: string): Promise<AppVersion | null> {
  if (cachedAppVersion !== undefined) return cachedAppVersion;

  try {
    const url = basePath ? `/${basePath}/deploy-info.json` : '/deploy-info.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json();
    cachedAppVersion = {
      commit: data.commit,
      branch: data.branch,
      updatedAt: data.updatedAt,
    };
  } catch {
    cachedAppVersion = null;
  }

  return cachedAppVersion;
}
