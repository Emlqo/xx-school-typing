const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const URL_TOKEN_PATTERN = /^https?:\/\/[^\s<>"']+$/;
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:)\]}]+$/;

function splitUrlToken(token) {
  const trailingMatch = token.match(TRAILING_PUNCTUATION_PATTERN);
  if (!trailingMatch) return { url: token, trailing: '' };

  const trailing = trailingMatch[0];
  return {
    url: token.slice(0, -trailing.length),
    trailing,
  };
}

export default function LinkifiedText({ text = '', className = '' }) {
  const parts = String(text || '').split(URL_PATTERN);

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (!URL_TOKEN_PATTERN.test(part)) return <span key={`${part}-${index}`}>{part}</span>;
        const { url, trailing } = splitUrlToken(part);

        return (
          <span key={`${url}-${index}`}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="font-black text-sky-600 underline decoration-sky-300 underline-offset-4 hover:text-teal-600"
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </p>
  );
}
