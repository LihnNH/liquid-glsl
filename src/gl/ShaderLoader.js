const includePattern = /^\s*#include\s+["<]([^">]+)[">]\s*$/gm;

async function loadText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha ao carregar shader: ${url}`);
  return response.text();
}

export async function loadShader(url, stack = new Set()) {
  const absolute = new URL(url, window.location.href);
  const key = absolute.href;
  if (stack.has(key)) throw new Error(`Include circular em shader: ${key}`);

  const nextStack = new Set(stack);
  nextStack.add(key);
  let source = await loadText(absolute);
  const includes = [...source.matchAll(includePattern)];

  for (const match of includes) {
    const includeUrl = new URL(match[1], absolute);
    const included = await loadShader(includeUrl, nextStack);
    source = source.replace(match[0], `\n// --- ${match[1]} ---\n${included}\n// --- end ${match[1]} ---\n`);
  }

  return source;
}
