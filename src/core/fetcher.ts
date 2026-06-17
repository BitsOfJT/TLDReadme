const GITHUB_URL_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/;

const README_FILENAMES = [
  'README.md',
  'readme.md',
  'Readme.md',
  'README.MD',
  'README.rst',
  'readme.rst',
  'README.txt',
  'readme.txt',
  'README',
  'readme',
];

export async function fetchReadme(input: string): Promise<string> {
  const trimmed = input.trim();

  const match = trimmed.match(GITHUB_URL_PATTERN);
  if (match) {
    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    return fetchFromGitHub(owner, repoName);
  }

  // Raw text input — return as-is
  return trimmed;
}

async function fetchFromGitHub(owner: string, repo: string): Promise<string> {
  for (const filename of README_FILENAMES) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filename}`;
    const response = await fetch(url);
    if (response.ok) {
      return response.text();
    }
  }
  throw new Error(
    `Could not find a README in ${owner}/${repo}. Make sure the repository exists and is public.`
  );
}
