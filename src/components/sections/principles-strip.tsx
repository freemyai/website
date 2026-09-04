const principles = [
  "LOCAL-FIRST",
  "PERSISTENT MEMORY",
  "ANY MODEL",
  "OWNER PERMISSIONS",
  "PORTABLE BY DESIGN",
];

export function PrinciplesStrip() {
  return (
    <section id="principles" className="border-border scroll-mt-24 border-y">
      <div className="container-site grid grid-cols-2 gap-x-6 gap-y-4 py-8 md:grid-cols-5">
        {principles.map((principle) => (
          <p
            key={principle}
            className="inline-flex items-center gap-2.5 font-mono text-xs font-medium tracking-[0.12em]"
          >
            <span className="status-dot" aria-hidden="true" />
            {principle}
          </p>
        ))}
      </div>
    </section>
  );
}
