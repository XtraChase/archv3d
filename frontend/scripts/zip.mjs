// Zips dist/ with index.html at the root, the layout Netcade's web-game upload expects.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const out = resolve('movie-studio-archviz-netcade.zip');
if (!existsSync(resolve(dist, 'index.html'))) throw new Error('dist/index.html missing, run the build first');
if (existsSync(out)) rmSync(out);

// tar on Windows 10+ (bsdtar) and macOS writes zip archives with -a. On Windows call System32's tar
// explicitly: Git Bash's GNU tar comes first on PATH, can't write zips and reads 'D:' as a remote host.
// Name the top-level entries rather than '.', which would prefix every path with './'.
const tar = process.platform === 'win32' ? resolve(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', out, '-C', dist, ...readdirSync(dist)], { stdio: 'inherit' });
console.log(`Wrote ${out}`);
