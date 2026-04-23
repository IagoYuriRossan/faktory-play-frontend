import DOMPurify from 'dompurify';

export interface ParsedBlock {
  type: string;
  id: string;
  html: string;
  index: number;
  length: number;
}

export const getEmbedUrl = (url: string) => {
  if (!url) return '';

  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)([0-9]+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
};

export const genId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const genBlock = (html: string, type = 'custom') => {
  const id = `b-${genId()}`;
  const sanitizeOpts: Parameters<typeof DOMPurify.sanitize>[1] =
    type === 'video' || type === 'embed'
      ? {
          WHOLE_DOCUMENT: false,
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'title'],
        }
      : { WHOLE_DOCUMENT: false };

  const safe = DOMPurify.sanitize(html, sanitizeOpts);
  return `<!-- block:${type}:${id} -->\n${safe}\n<!-- /block:${type}:${id} -->`;
};

export const parseBlocks = (content: string): ParsedBlock[] => {
  const re = /<!-- block:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+) -->([\s\S]*?)<!-- \/block:\1:\2 -->/g;
  const blocks: ParsedBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    blocks.push({
      type: match[1],
      id: match[2],
      html: match[3],
      index: match.index,
      length: match[0].length,
    });
  }

  return blocks;
};

export const createLogoContent = () => {
  const logoHtml = '<div class="faktory-logo"><img src="/logo.png" alt="Faktory Logo" style="max-width:320px;"/></div>';
  return genBlock(logoHtml, 'logo');
};
