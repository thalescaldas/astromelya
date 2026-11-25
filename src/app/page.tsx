import { SiteHeader } from "@/components/header/SiteHeader";
import { Flower } from "@/components/flower/Flower";
import { GenesisField } from "@/components/particles/GenesisField";
import { getActivePhase } from "@/config/evolution";
import { routes, site } from "@/config/site";
import styles from "./page.module.css";

export default function HomePage() {
  const phase = getActivePhase();

  return (
    <>
      <SiteHeader current={routes.home} />
      <main className={styles.stage}>
        <h1 className="visually-hidden">{site.name}</h1>
        {phase.flower.mask ? (
          <GenesisField maskSrc={phase.flower.mask.src}>
            <Flower flower={phase.flower} bloom={phase.animations.bloom.enabled} />
          </GenesisField>
        ) : (
          <Flower flower={phase.flower} bloom={phase.animations.bloom.enabled} />
        )}
      </main>
    </>
  );
}
