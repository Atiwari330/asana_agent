'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, createElement } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

// Custom component for unknown/custom HTML tags
const UnknownTagHandler = ({
  children,
  tagName,
  ...props
}: {
  children?: React.ReactNode;
  tagName: string;
  [key: string]: any;
}) => {
  // Render unknown tags as divs with data attribute for potential styling
  return createElement(
    'div',
    {
      ...props,
      'data-custom-tag': tagName,
      className: cn(
        'custom-tag',
        `custom-tag-${tagName}`,
        'my-2 p-3 rounded-lg border-l-4',
        // Special styling for task tags
        tagName === 'task' && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
        // Special styling for action tags
        tagName === 'action' && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        // Default styling for other custom tags
        !['task', 'action'].includes(tagName) && 'border-gray-400 bg-gray-50 dark:bg-gray-950/20',
      )
    },
    children
  );
};

// Create a proxy to handle all potential custom tags dynamically
const createCustomComponents = () => {
  const knownHTMLTags = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
    'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
    'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
    'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
    'em', 'embed',
    'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins',
    'kbd', 'label', 'legend', 'li', 'link',
    'main', 'map', 'mark', 'menu', 'meta', 'meter',
    'nav', 'noscript',
    'object', 'ol', 'optgroup', 'option', 'output',
    'p', 'param', 'picture', 'pre', 'progress',
    'q', 'rp', 'rt', 'ruby',
    's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
    'strong', 'style', 'sub', 'summary', 'sup', 'svg',
    'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead',
    'time', 'title', 'tr', 'track',
    'u', 'ul',
    'var', 'video',
    'wbr'
  ];

  return new Proxy({}, {
    get: (target, prop: string) => {
      // If it's a known HTML tag, use default rendering
      if (knownHTMLTags.includes(prop)) {
        return undefined;
      }

      // For unknown tags, use our custom handler
      return (props: any) => <UnknownTagHandler {...props} tagName={prop} />;
    }
  });
};

// Create the components mapping once
const customComponents = createCustomComponents();

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto',
        className,
      )}
      components={customComponents as any}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';
