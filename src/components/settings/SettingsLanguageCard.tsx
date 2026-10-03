/** Settings Language card body (copy only; parent owns section chrome). */
import { GoogleLanguageSelect } from "@/components/TranslateWidget";

export function SettingsLanguageCard() {
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Choose your language.</p>
      <div className="mt-4">
        <GoogleLanguageSelect />
      </div>
    </>
  );
}
