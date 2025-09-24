import { ConfidentialP2PEtherDemo } from "@/components/ConfidentialP2PEtherDemo";


export default function Home() {
  return (
    <main className="">
      <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
        <ConfidentialP2PEtherDemo />
      </div>
    </main>
  );
}
