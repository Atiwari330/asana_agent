/**
 * Custom rehype plugin to sanitize unknown HTML tags
 * This plugin transforms any unknown/custom HTML tags to divs with data attributes
 * providing a second layer of protection against rendering errors
 */

import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

// Comprehensive list of valid HTML5 tags
const VALID_HTML_TAGS = new Set([
  // Main root
  'html',
  // Document metadata
  'base', 'head', 'link', 'meta', 'style', 'title',
  // Sectioning root
  'body',
  // Content sectioning
  'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hgroup', 'main', 'nav', 'section',
  // Text content
  'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'menu',
  'ol', 'p', 'pre', 'ul',
  // Inline text semantics
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i',
  'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong',
  'sub', 'sup', 'time', 'u', 'var', 'wbr',
  // Image and multimedia
  'area', 'audio', 'img', 'map', 'track', 'video',
  // Embedded content
  'embed', 'iframe', 'object', 'param', 'picture', 'portal', 'source',
  // Scripting
  'canvas', 'noscript', 'script',
  // Demarcating edits
  'del', 'ins',
  // Table content
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  // Forms
  'button', 'datalist', 'fieldset', 'form', 'input', 'label', 'legend', 'meter',
  'optgroup', 'option', 'output', 'progress', 'select', 'textarea',
  // Interactive elements
  'details', 'dialog', 'summary',
  // Web Components
  'slot', 'template',
  // SVG and MathML (common ones)
  'svg', 'math'
]);

export interface RehypeSanitizeCustomTagsOptions {
  /**
   * Additional tags to consider as valid (won't be transformed)
   */
  allowedTags?: string[];
  /**
   * Whether to preserve the original tag name as a data attribute
   */
  preserveTagName?: boolean;
  /**
   * Custom class name to add to transformed elements
   */
  className?: string;
}

/**
 * Rehype plugin to sanitize unknown/custom HTML tags
 * Transforms unknown tags to divs with data attributes
 */
export function rehypeSanitizeCustomTags(options: RehypeSanitizeCustomTagsOptions = {}) {
  const {
    allowedTags = [],
    preserveTagName = true,
    className = 'sanitized-custom-tag'
  } = options;

  // Combine default valid tags with user-provided allowed tags
  const validTags = new Set([...VALID_HTML_TAGS, ...allowedTags]);

  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // Check if this is an unknown/custom tag
      if (!validTags.has(node.tagName)) {
        // Store original tag name if requested
        if (preserveTagName) {
          node.properties = {
            ...node.properties,
            'data-original-tag': node.tagName
          };
        }

        // Add custom class
        const existingClass = node.properties?.className;
        const classes = [className];

        if (existingClass) {
          if (Array.isArray(existingClass)) {
            classes.push(...existingClass);
          } else {
            classes.push(String(existingClass));
          }
        }

        node.properties = {
          ...node.properties,
          className: classes
        };

        // Transform to div
        node.tagName = 'div';
      }
    });
  };
}

export default rehypeSanitizeCustomTags;