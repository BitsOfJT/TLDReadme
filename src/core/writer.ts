import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function writeTldr(tldr: string): Promise<string> {
  console.log('\n' + tldr + '\n');

  const filePath = join(process.cwd(), 'TLDReadme.md');
  await writeFile(filePath, tldr, 'utf-8');

  return filePath;
}
