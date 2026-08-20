import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renderuje odpověď asistenta jako Markdown (nadpisy, seznamy, kód, tabulky…).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
