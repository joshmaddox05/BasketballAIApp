// coachInviteService.js — the app side of coach→athlete invite links.
//
// The pending code has an unusually long life: an athlete taps a link with no
// account, installs or opens the app, signs up, then goes through six onboarding
// screens before the invite can be claimed. It cannot be claimed sooner, because
// claiming depends on their grade, and grade is what decides whether the coach
// gets a live connection or a request awaiting a guardian. So the code sits in
// AsyncStorage across an auth boundary and a full onboarding flow.
//
// Every failure here is deliberately quiet on the athlete's side and loud in the
// logs. If a claim fails, the athlete still has a working account — they are just
// not on the roster yet — and that is far better than blocking someone's first
// session on a network error. The coach can always re-send the link.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';
import { STORAGE_KEYS } from '../utils/constants';
import { parseInviteLink, normalizeInviteCode, isValidInviteCode } from '../utils/inviteLink';
import logger from '../utils/logger';

const call = (name) => httpsCallable(functions, name);

// ─── the pending code ────────────────────────────────────────────────────────

/** Remember a code captured from a link, to be claimed after onboarding. */
export const storePendingInvite = async (code) => {
  const clean = normalizeInviteCode(code);
  if (!isValidInviteCode(clean)) return false;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_COACH_INVITE, clean);
    return true;
  } catch (error) {
    logger.warn('Could not store pending coach invite', error);
    return false;
  }
};

/** @returns {Promise<string|null>} */
export const getPendingInvite = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COACH_INVITE);
    return isValidInviteCode(stored) ? stored : null;
  } catch (error) {
    return null;
  }
};

export const clearPendingInvite = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COACH_INVITE);
  } catch (error) {
    logger.warn('Could not clear pending coach invite', error);
  }
};

/** Capture an invite from a deep link or pasted URL. @returns the code, or null */
export const capturePendingInviteFromUrl = async (url) => {
  const code = parseInviteLink(url);
  if (!code) return null;
  await storePendingInvite(code);
  return code;
};

// ─── the callables ───────────────────────────────────────────────────────────

/**
 * Who is inviting me? Safe to call with no account — that is the point, since
 * the athlete has not signed up yet when the app first shows this.
 * @returns {Promise<{valid:boolean, coachName?:string, teamName?:string, reason?:string}>}
 */
export const resolveCoachInvite = async (code) => {
  const clean = normalizeInviteCode(code);
  if (!isValidInviteCode(clean)) return { valid: false, reason: 'invalid' };
  try {
    const { data } = await call('resolveCoachInvite')({ code: clean });
    return data || { valid: false, reason: 'error' };
  } catch (error) {
    logger.warn('resolveCoachInvite failed', error);
    return { valid: false, reason: 'error' };
  }
};

/**
 * Attach the signed-in athlete to the coach.
 *
 * MUST run after the athlete's grade has been written, or the server cannot tell
 * whether the guardian gate applies and would have to assume the unsafe answer.
 *
 * @param {string} code
 * @param {{guardianEmail?: string}} [options]
 * @returns {Promise<{success:boolean, pending?:boolean, coachName?:string, error?:string}>}
 */
export const claimCoachInvite = async (code, { guardianEmail } = {}) => {
  const clean = normalizeInviteCode(code);
  if (!isValidInviteCode(clean)) return { success: false, error: 'invalid' };
  try {
    const { data } = await call('claimCoachInvite')({ code: clean, guardianEmail: guardianEmail || null });
    // Clear only on a definite answer. A network failure leaves the code in
    // place so the next app open can retry; clearing here would strand the
    // athlete off the roster with nothing left to retry from.
    if (data?.success) await clearPendingInvite();
    return data || { success: false, error: 'error' };
  } catch (error) {
    logger.warn('claimCoachInvite failed', error);
    return { success: false, error: 'network' };
  }
};

/**
 * Claim whatever is pending, if anything. Called once onboarding completes.
 * Silent when there is nothing to do, which is the common case.
 */
export const claimPendingInviteIfAny = async ({ guardianEmail } = {}) => {
  const code = await getPendingInvite();
  if (!code) return null;
  return claimCoachInvite(code, { guardianEmail });
};

/** Coach side: create the team link. */
export const createCoachInvite = async ({ teamName } = {}) => {
  try {
    const { data } = await call('createCoachInvite')({ teamName: teamName || null });
    return data || { success: false, error: 'error' };
  } catch (error) {
    logger.error('createCoachInvite failed', error);
    return { success: false, error: 'Could not create the invite link.' };
  }
};
