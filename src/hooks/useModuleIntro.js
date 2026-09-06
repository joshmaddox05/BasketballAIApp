// useModuleIntro.js — first-open explainer gating, shared by every module tile.
//
// Three surfaces navigate to modules: ModuleGrid (player + parent homes) and the
// hand-rolled module sections on CoachHomeScreen and ScoutHomeScreen. Putting the
// gate here keeps them from drifting — an intro that fires on one role's home and
// not another's is worse than no intro.
//
// Usage:
//   const { openModule, introProps } = useModuleIntro(navigation, navParams);
//   ...
//   onPress={() => openModule(mod, unlocked)}
//   <ModuleIntro {...introProps} />
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getModuleIntro, introSeenKey } from '../config/moduleIntros';

export const useModuleIntro = (navigation, navParams) => {
  // `pending` holds the module being explained; `open` drives the sheet.
  //
  // They are separate because clearing `pending` on dismiss makes ModuleIntro
  // return null, which unmounts BottomSheet mid-animation — the sheet vanishes
  // instead of leaving, the exact thing BottomSheet's two-layer animation exists
  // to avoid. Keeping `pending` set while `open` goes false lets the sheet play
  // its exit and unmount itself; the next open simply replaces it.
  const [pending, setPending] = useState(null);
  const [open, setOpen] = useState(false);

  const navigate = useCallback(
    (mod, unlocked) =>
      navigation.navigate(unlocked ? mod.key : 'Subscription', unlocked ? navParams : undefined),
    [navigation, navParams]
  );

  const openModule = useCallback(
    async (mod, unlocked) => {
      // A locked module goes straight to the paywall — explaining something you
      // cannot open would be a worse first impression than the gate itself.
      if (!unlocked) {
        navigate(mod, false);
        return;
      }

      const intro = getModuleIntro(mod.key);
      if (!intro) {
        navigate(mod, true);
        return;
      }

      try {
        const seen = await AsyncStorage.getItem(introSeenKey(mod.key));
        if (seen === 'true') {
          navigate(mod, true);
          return;
        }
      } catch (error) {
        // Storage unavailable — opening the module matters more than the intro.
        navigate(mod, true);
        return;
      }

      setPending({ mod, intro });
      setOpen(true);
    },
    [navigate]
  );

  // Marked seen on dismissal rather than on open, so an intro interrupted by a
  // backgrounded app still offers itself next time.
  const dismiss = useCallback(
    async (navigateAfter) => {
      const entry = pending;
      // Close the sheet but keep `pending`, so it can animate out.
      setOpen(false);
      if (!entry) return;
      try {
        await AsyncStorage.setItem(introSeenKey(entry.mod.key), 'true');
      } catch (error) {
        // Non-fatal: the intro will simply offer itself again.
      }
      if (navigateAfter) navigate(entry.mod, true);
    },
    [pending, navigate]
  );

  return {
    openModule,
    introProps: {
      visible: open,
      intro: pending?.intro,
      moduleLabel: pending?.mod?.label || 'module',
      onClose: () => dismiss(false),
      onDone: () => dismiss(true),
    },
  };
};

export default useModuleIntro;
