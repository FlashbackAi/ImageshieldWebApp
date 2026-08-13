import Image from "next/image";

/**
 * The pitch. A still frame sits behind the headline — in the design the type rides
 * up over the bottom third of the image, which is near-black there, so the overlap
 * reads as one composition rather than a card with a caption.
 */
export function ProtectsSection() {
  return (
    <section id="how-it-works" className="bg-night px-6 pt-10 lg:pt-[47px]">
      <Image
        src="/media/protects.jpg"
        alt="A woman looking at her phone, her face ringed by a glowing shield, with anonymous hooded figures fading into the dark behind her."
        width={1792}
        height={1057}
        sizes="(max-width: 896px) 100vw, 896px"
        className="mx-auto w-full max-w-[896px]"
      />

      <div className="relative z-10 mx-auto -mt-12 flex max-w-[848px] flex-col items-center text-center sm:-mt-24 lg:-mt-[169px]">
        <h2 className="bg-linear-to-r from-white via-accent-soft to-accent-bright bg-clip-text text-[2rem] leading-[1.02] font-bold text-transparent [filter:drop-shadow(0_10px_8px_rgba(0,0,0,0.04))_drop-shadow(0_4px_3px_rgba(0,0,0,0.1))] sm:text-[2.75rem] lg:text-[72px]">
          ImageShield® Protects You From AI, Deepfakes and Scams
        </h2>

        <p className="mt-8 max-w-[730px] text-base leading-relaxed text-ink-onnight-muted lg:mt-[41px] lg:text-2xl lg:leading-8">
          ImageShield protects you and your family by monitoring for deepfakes,
          scams, impersonations, and photo-based identity theft, helping you stay
          safe and in control of your digital image.
        </p>

        <p className="mt-8 max-w-[730px] text-base leading-relaxed text-ink-onnight-muted lg:mt-[34px] lg:text-2xl lg:leading-8">
          If you&apos;ve ever shared a photo of yourself or your family - on social
          media, by text, via email - you may already be a victim of image abuse and
          don&apos;t know it. More than 1 in 5 people say they&apos;ve had their
          likeness misused online.
        </p>

        <p className="mt-10 max-w-[720px] text-sm leading-relaxed text-ink-onnight-muted lg:mt-[53px] lg:text-xl lg:leading-7">
          Get the ImageShield app and start protecting yourself and your family from
          online predators. Available now on iOS and Android.
        </p>
      </div>
    </section>
  );
}
