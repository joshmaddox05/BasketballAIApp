// useModuleSubject.js — resolve whose data a module screen is showing.
//
// CoachAthletesScreen has always navigated to Blueprint360 with a `playerUid`, and
// the module screens have always ignored it — reading the viewer's own context and
// presenting it under the athlete's name. Silently showing one person's data
// labelled as another's is worse than showing nothing, so a failed or unauthorized
// read here surfaces as an explicit error state rather than a fallback.
//
// Reads are permitted by firestore.rules `canViewDeepPlayerData` (owner, connected
// parent/coach, or a parent-approved paid scout). Goals are a separate read —
// `getLinkedPlayerSummary` does not return them, and the milestones screen needs
// them — allowed by the `users/{uid}/goals` rule `canViewPlayerData`.

import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getLinkedPlayerSummary, getUserGoals } from '../services/firestoreService';
import logger from '../utils/logger';

const EMPTY = {
  profile: null,
  evalRankScore: null,
  blueprint360Plan: null,
  goals: [],
};

/**
 * @param {object} route  the screen's route (reads `route.params.playerUid`)
 * @returns {{
 *   uid: string|null, isSelf: boolean, readOnly: boolean, displayName: string|null,
 *   profile: object|null, evalRankScore: object|null, blueprint360Plan: object|null,
 *   goals: Array, loading: boolean, error: string|null, reload: Function,
 * }}
 */
export const useModuleSubject = (route) => {
  const context = useAppContext();
  const { userData, evalRankScore, blueprint360Plan, goals } = context;

  const viewerUid = userData?.uid || null;
  const requestedUid = route?.params?.playerUid || null;
  const isSelf = !requestedUid || requestedUid === viewerUid;

  const [subject, setSubject] = useState(EMPTY);
  const [loading, setLoading] = useState(!isSelf);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (isSelf || !requestedUid) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, subjectGoals] = await Promise.all([
        getLinkedPlayerSummary(requestedUid),
        getUserGoals(requestedUid).catch(() => []),
      ]);

      if (!summary?.profile) {
        setError("You don't have access to this athlete's data");
        setSubject(EMPTY);
        return;
      }

      setSubject({
        profile: summary.profile,
        evalRankScore: summary.evalRank || null,
        blueprint360Plan: summary.blueprint || null,
        goals: subjectGoals || [],
      });
    } catch (err) {
      logger.error('useModuleSubject load failed', err);
      setError("You don't have access to this athlete's data");
      setSubject(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [isSelf, requestedUid]);

  useEffect(() => {
    let alive = true;
    if (isSelf) {
      setSubject(EMPTY);
      setLoading(false);
      setError(null);
      return undefined;
    }
    load().catch(() => {});
    return () => {
      alive = false;
    };
  }, [isSelf, load]);

  if (isSelf) {
    return {
      uid: viewerUid,
      isSelf: true,
      readOnly: false,
      displayName: userData?.displayName || userData?.name || null,
      profile: userData || null,
      evalRankScore,
      blueprint360Plan,
      goals: goals || [],
      loading: false,
      error: null,
      reload: load,
    };
  }

  return {
    uid: requestedUid,
    isSelf: false,
    readOnly: true,
    displayName: subject.profile?.displayName || subject.profile?.name || 'this athlete',
    profile: subject.profile,
    evalRankScore: subject.evalRankScore,
    blueprint360Plan: subject.blueprint360Plan,
    goals: subject.goals,
    loading,
    error,
    reload: load,
  };
};

export default useModuleSubject;
