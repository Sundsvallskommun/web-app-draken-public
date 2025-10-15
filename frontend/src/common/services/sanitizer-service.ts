import SanitizeHTML from 'sanitize-html';

const config = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'blockquote',
    'p',
    'a',
    'ul',
    'ol',
    'li',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'del',
    'br',
    'div',
    'sup',
    'sub',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'class'],
    img: ['src'],
  },
  // Lots of these won't come up by default because we don't allow them
  selfClosing: ['img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta'],
  // URL schemes we permit
  allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
  allowedSchemesByTag: {},
};

const inlineConfig = { ...config, allowedTags: [] };

export const sanitized: (unsafe: string) => string = (unsafe) => {
  return SanitizeHTML(unsafe, config);
};

export const sanitizedInline: (unsafe: string) => string = (unsafe) => {
  return SanitizeHTML(unsafe.replace('</', ' </'), inlineConfig);
};

export const formatMessage: (text: string) => string = (text) => {
  return (
    text
      ?.replace(/\n/g, '<br>')
      // Normalize both <br> and <br/>
      .replace(/<br\s*\/?>/gi, '<br/>')
      // Remove all <br/>s before the first non-<br/> tag/content
      .replace(/^(<br\/>\s*)+/i, '')
      // Remove all <br/>s after the last non-<br/> tag/content
      .replace(/(<br\/>\s*)+$/i, '')
      // Styling for links
      .replace(/<a /gi, '<a class="text-vattjom-surface-primary underline hover:text-vattjom-surface-primary-hover" ')
  );
};

export const sanitizeHtmlMessageBody: (text: string) => string = (text) => {
  return SanitizeHTML(text).replaceAll(/<br\s*\/?>/gi, '</p><p>');
};

export default sanitized;
