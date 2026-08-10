import { Paw } from "@/components/Cat";

/** 배경에 옅게 깔리는 발바닥 자국 */
export default function BackgroundDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <Paw
        size={120}
        className="absolute left-[-30px] top-[12%] rotate-[-18deg] text-tone-pink opacity-15"
      />
      <Paw
        size={80}
        className="absolute right-[4%] top-[46%] rotate-[24deg] text-tone-blue opacity-15"
      />
      <Paw
        size={150}
        className="absolute bottom-[-30px] left-[22%] rotate-[9deg] text-tone-purple opacity-15"
      />
      <Paw
        size={64}
        className="absolute right-[26%] top-[6%] rotate-[-32deg] text-tone-mint opacity-15"
      />
    </div>
  );
}
