// src/components/Header.tsx

interface Props { title?: string }

export default function Header({ title = 'TESA Map Monitoring' }: Props) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-green-500">{title}</h1>
    </header>
  );
}
