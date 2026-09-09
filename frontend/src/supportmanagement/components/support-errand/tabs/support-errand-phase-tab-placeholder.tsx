interface PhaseTabPlaceholderProps {
  heading: string;
  intro: string;
  planned: string[];
}

export const PhaseTabPlaceholder: React.FC<PhaseTabPlaceholderProps> = ({ heading, intro, planned }) => (
  <div className="pt-xl pb-16 px-40 flex flex-col">
    <div className="flex flex-col gap-md mb-32">
      <h2 className="text-h2-md">{heading}</h2>
      <p className="text-dark-secondary">{intro}</p>
      <div className="border-1 rounded-12 p-16">
        <h3 className="text-h3-md mb-12">Planerat innehåll</h3>
        <ul className="list-disc pl-24 flex flex-col gap-8">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);
